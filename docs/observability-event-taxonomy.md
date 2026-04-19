# Observability Event Taxonomy

Updated: 2026-04-20
Purpose: Vibe Studio에 최소 추적 로직을 붙일 때 사용할 이벤트 이름, 단계 구분, 기본 payload 범위를 고정한다.

## Rule
- 이 문서는 `docs/observability-foundation.md`의 구현 직전 보조 문서다
- 이 문서는 source-of-truth 제품 문서를 덮어쓰지 않는다
- 이벤트는 제품을 블랙박스로 만들기 위한 수단이 아니라, 학습 흐름과 실패 지점을 이해하기 위한 수단이다
- keystroke 단위 추적은 하지 않는다

## 1. 설계 원칙
이벤트 taxonomy는 아래 원칙을 따른다.

1. milestone 이벤트만 기록한다
2. app 이벤트와 runtime 이벤트를 분리한다
3. engine contract를 오염시키지 않는다
4. 원문 전체 저장은 기본값으로 두지 않는다
5. follow-up과 refine은 post-result layer로 따로 본다

## 2. 공통 필드
모든 이벤트는 가능하면 아래 공통 필드를 갖는다.

- `event_name`
- `session_id`
- `run_id`
- `stage`
- `surface`
- `created_at`

선택 필드:
- `mode_guess`
- `renderer`
- `provider`
- `model`
- `approval_level`
- `next_step`
- `card_hint`

Rule:
- 공통 필드는 가능한 한 좁게 유지한다
- payload는 event별로 필요한 값만 추가한다

## 3. Stage 구분
이벤트 `stage`는 아래 값만 먼저 쓴다.

- `start`
- `clarify`
- `approval`
- `result`
- `followup`
- `provider-session`
- `runtime`
- `error`

Rule:
- UI 화면 이름 대신 제품 흐름 단계 이름을 우선한다
- 새 stage를 늘리기 전에 기존 값으로 충분한지 먼저 본다

## 4. App Event Set
### Start / input
- `session_started`
- `input_submitted`
- `example_clicked`
- `hint_selected`
- `flow_reset_clicked`

기본 payload:
- `input_length`
- `card_hint`
- `source_kind` (`free-input` | `example`)

### Clarify
- `clarify_shown`
- `clarify_submitted`

기본 payload:
- `question_id`
- `remaining_question_count`

### Approval
- `approval_shown`
- `approval_continue_clicked`
- `approval_revise_clicked`
- `approval_revise_mode_opened`
- `approval_revise_resubmitted`

기본 payload:
- `approval_level`
- `renderer`
- `reason_code_count`

### Result
- `result_rendered`
- `result_restart_clicked`

기본 payload:
- `renderer`
- `output_count`
- `note_count`
- `pivot_recommended`

## 5. Prompt Help Event Set
### Prompt learning panel
- `prompt_help_learning_panel_shown`
- `prompt_help_copy_clicked`

기본 payload:
- `renderer`
- `summary_item_count`
- `always_visible_technique_count`
- `conditional_technique_count`

Rule:
- learning panel은 prompt 결과 아래 붙는 별도 학습 레이어로 본다
- technique별 노출 여부는 count와 label 수준까지만 먼저 본다

## 6. Stage 1 Follow-Up Event Set
### Generic follow-up
- `followup_action_shown`
- `followup_action_clicked`
- `followup_request_started`
- `followup_request_completed`
- `followup_request_failed`

기본 payload:
- `action_id`
- `source_renderer`
- `result_kind`

### Review refinement
- `review_refinement_started`
- `review_refinement_completed`
- `review_refinement_failed`

기본 payload:
- `answered_question_count`
- `remaining_question_count`
- `action_id` = `revise-from-review`

Rule:
- Stage 1에서는 결과당 follow-up 1개만 허용하므로, chain depth 같은 필드는 두지 않는다

## 7. Provider Session Event Set
- `provider_session_connect_started`
- `provider_session_connected`
- `provider_session_connect_failed`
- `provider_session_cleared`
- `provider_session_expired`
- `provider_model_changed`

기본 payload:
- `provider`
- `model`
- `has_active_session`

Rule:
- API key 원문은 이벤트 payload에 넣지 않는다
- provider/model 수준만 남긴다

## 8. Runtime Event Set
- `analyze_request_started`
- `analyze_request_completed`
- `run_request_started`
- `run_request_completed`
- `followup_runtime_started`
- `followup_runtime_completed`

기본 payload:
- `provider`
- `model`
- `renderer`
- `duration_ms`
- `response_status`

## 9. Error Event Set
- `api_request_failed`
- `renderer_failed`
- `provider_request_failed`
- `client_render_failed`

기본 payload:
- `error_stage`
- `error_type`
- `status_code`
- `message_preview`

Rule:
- 전체 stack trace를 장기 저장 기본값으로 두지 않는다
- first-line message나 분류된 error type을 우선 저장한다

## 10. 초기 구현 우선순위
최초 구현은 아래 이벤트만 먼저 붙이는 것이 맞다.

### Priority 1
- `session_started`
- `input_submitted`
- `clarify_shown`
- `clarify_submitted`
- `approval_shown`
- `approval_continue_clicked`
- `approval_revise_clicked`
- `result_rendered`
- `api_request_failed`

### Priority 2
- `followup_action_clicked`
- `followup_request_started`
- `followup_request_completed`
- `followup_request_failed`
- `review_refinement_started`
- `review_refinement_completed`
- `approval_revise_mode_opened`
- `approval_revise_resubmitted`

### Priority 3
- `prompt_help_learning_panel_shown`
- `prompt_help_copy_clicked`
- `provider_session_*`

## 11. 저장 금지 / 제한 항목
초기 구현에서는 아래를 기본 저장 금지로 둔다.

- 입력 원문 전체
- keystroke 로그
- API key
- clipboard 원문
- follow-up 본문 전체

대신 권장:
- `input_length`
- `input_preview_redacted`
- `renderer`
- `action_id`
- `error_type`
- `message_preview`

## 12. 구현 연결 메모
현재 코드 기준으로 이벤트를 붙일 위치는 대략 아래다.

### product-web
- `useStudioFlow.ts`
- `StartPanel.tsx`
- `ApprovalPanel.tsx`
- `ResultPanel.tsx`
- `useProviderSession.ts`

### product-server
- `server.ts`
- `run-stage1-follow-up.ts`

Rule:
- app 이벤트는 `product-web`
- runtime / error 이벤트는 `product-server`
에서 먼저 처리한다

## 13. 현재 결론
이 taxonomy 수준까지만 고정되면 다음 단계에서 바로 시작할 수 있다.

1. 이벤트 송신 인터페이스 정의
2. D1 테이블 SQL 초안 작성
3. `product-web` / `product-server` 최소 추적 로직 구현

즉 지금 문서는 "무엇을 측정할지"를 먼저 잠가서, 구현 중에 범위가 불필요하게 퍼지는 것을 막는 역할을 맡는다.
