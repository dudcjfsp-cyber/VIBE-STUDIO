# Observability Foundation

Updated: 2026-04-19
Purpose: Vibe Studio를 외부 사용자에게 점진적으로 열기 전에 필요한 최소 관측/추적 기준을 정리해두는 focused note

## Rule
- 이 문서는 제품화 준비를 위한 운영 기준 메모다
- 이 문서는 `docs/product-intent.md`, `docs/PRD.md`, `docs/TRD.md`를 덮어쓰지 않는다
- 이 문서는 즉시 구현 지시서가 아니라, 나중에 추적 로직을 따로 붙일 때의 준비 문서다
- 관측 로직은 제품을 블랙박스로 만드는 방향이 아니라, 학습 흐름과 실패 지점을 이해하기 위한 방향으로만 쓴다

## 1. 왜 필요한가
현재 Vibe Studio는 프론트 중심 MVP 흐름을 빠르게 검증하는 데에는 충분하다.
하지만 제품화 단계로 가면 아래 질문에 답할 수 있어야 한다.

- 어떤 종류의 입력이 실제로 가장 많이 들어오는가
- 사용자는 어느 단계에서 가장 자주 멈추는가
- clarify, approval, result, follow-up 흐름이 실제로 끝까지 이어지는가
- 어떤 renderer와 후속 action이 실제로 쓰이는가
- 어디에서 오류가 나는가
- 어떤 결과가 학습적으로 도움이 되었고, 어떤 지점이 혼란을 만들었는가

Rule:
- 제품화에 반드시 필요한 것은 "무거운 백엔드"가 아니라 "운영 가능한 최소 관측 가능성"이다
- 초기에 필요한 것은 전수 저장보다, 개선 판단에 필요한 핵심 신호다

## 2. 이 문서의 결론
Vibe Studio는 제품화 단계에서 최소한의 관측 체계를 가져야 한다.

다만 아래처럼 작게 시작하는 것이 맞다.

1. 프론트는 유지한다
2. 서버리스 endpoint 하나로 이벤트를 받는다
3. 저비용 저장소에 세션/실행/오류 중심 데이터만 남긴다
4. 제품 분석 도구는 행동 흐름 확인에만 제한적으로 쓴다
5. 민감한 입력 원문은 기본적으로 전량 저장하지 않는다

## 3. 지금 당장 필요한 것과 아닌 것
### 지금 당장 필요한 것
- 세션 단위 식별자
- run 단위 식별자
- 어떤 단계가 시작/완료/실패했는지 남기는 이벤트
- 오류 위치와 오류 메시지 기록
- 어떤 결과와 follow-up이 실제로 노출되었는지 기록
- approval, revise, continue 같은 핵심 선택 기록

### 아직 미뤄도 되는 것
- 복잡한 계정 체계
- 장기 히스토리 제품 기능
- 실시간 대시보드
- 고급 BI 파이프라인
- 모든 입력 원문의 장기 보관
- 세밀한 개인화 추천

## 4. 관측이 답해야 하는 핵심 질문
### 제품 질문
- 사용자는 review, plan, architecture, prompt 중 무엇을 더 자주 쓰는가
- approval에서 이탈이 많은가, clarify에서 이탈이 많은가
- follow-up action은 실제로 눌리는가
- review refinement나 입력 보완 UI가 학습적으로 도움이 되는가

### 운영 질문
- 어떤 endpoint에서 오류가 자주 나는가
- 어떤 provider/model 조합에서 실패가 많은가
- follow-up API 연결 누락이나 renderer mismatch가 있는가
- 프론트 렌더링은 되었는데 후속 결과 표시는 실패하는가

Rule:
- 저장 목적은 감시가 아니라 개선 판단이어야 한다
- 측정 항목은 "궁금하니까 다 저장"이 아니라 "행동을 개선하는 데 필요한가"로 제한한다

## 5. 권장 구현 경계
관측 로직을 넣더라도 기존 경계는 유지한다.

### App Layer
- 화면 진입
- 버튼 클릭
- approval/revise/continue 선택
- 결과 노출
- follow-up action 실행

### Product Runtime / Server
- 요청 수신
- renderer 실행 시작/완료/실패
- follow-up 실행 시작/완료/실패
- provider/model 오류
- 응답 시간과 상태 코드

### Engine / Renderer
- 관측을 위해 shared semantic contract를 오염시키지 않는다
- engine contract 안에 분석 도구용 필드를 억지로 늘리지 않는다
- renderer는 결과 생성 책임만 유지하고, 운영 이벤트 기록은 runtime 경계에서 처리한다

Rule:
- app은 사용자 행동 이벤트를 남기고
- runtime은 실행 이벤트와 오류를 남긴다
- engine core와 renderer는 관측 때문에 제품 의미 계약이 바뀌면 안 된다

## 6. 최소 이벤트 범위
초기에는 아래 정도만 있으면 충분하다.

### Session / flow
- `session_started`
- `input_submitted`
- `analyze_completed`
- `clarify_shown`
- `clarify_submitted`
- `approval_shown`
- `approval_continue_clicked`
- `approval_revise_clicked`
- `result_rendered`
- `result_restart_clicked`

### Stage 1 follow-up
- `followup_action_shown`
- `followup_action_clicked`
- `followup_request_started`
- `followup_request_completed`
- `followup_request_failed`

### Review refinement / input revise
- `review_refinement_started`
- `review_refinement_completed`
- `approval_revise_mode_opened`
- `approval_revise_resubmitted`

### Error / runtime
- `api_request_failed`
- `renderer_failed`
- `provider_request_failed`
- `client_render_failed`

Rule:
- keystroke 단위 추적은 하지 않는다
- submit, click, complete, fail 같은 milestone 이벤트만 먼저 다룬다

## 7. 최소 저장 구조
초기에는 아래 네 테이블이면 충분하다.

### `sessions`
- `id`
- `started_at`
- `entry_surface`
- `client_version`

### `runs`
- `id`
- `session_id`
- `mode_guess`
- `renderer`
- `provider`
- `model`
- `started_at`
- `completed_at`
- `status`

### `events`
- `id`
- `session_id`
- `run_id`
- `event_name`
- `stage`
- `payload_json`
- `created_at`

### `errors`
- `id`
- `session_id`
- `run_id`
- `error_type`
- `error_stage`
- `message`
- `status_code`
- `created_at`

Rule:
- 원문 전체를 기본 컬럼으로 두지 않는다
- 필요하면 마스킹된 요약, 길이, 분류 태그만 우선 남긴다
- 원문 저장은 별도 정책 합의 없이는 기본값으로 켜지지 않는다

## 8. 입력 데이터 저장 원칙
Vibe Studio는 학습형 환경이므로 사용자가 자유롭게 입력한다.
그래서 입력 데이터는 특히 보수적으로 다뤄야 한다.

### 기본 원칙
- 입력 원문 전량 저장을 기본값으로 두지 않는다
- 디버깅에는 요약, 길이, 분류, 단계 정보가 먼저다
- 재현이 꼭 필요한 오류만 제한적으로 샘플링한다
- 민감정보 가능성이 있는 입력은 redaction 이후에만 저장한다

### 권장 기본값
- 원문 대신 `input_preview_redacted`
- 글자 수
- 선택 카드 또는 최종 renderer
- review/create 여부
- approval/clarify 발생 여부

## 9. 저비용 운영 권장안
초기 제품화에서는 아래 조합이 가장 가볍다.

### 권장 조합
- 정적 프론트: 현재 방식 유지
- 이벤트 수집 endpoint: Cloudflare Workers
- 저비용 SQL 저장: Cloudflare D1
- 서버 로그: Workers Logs
- 제품 행동 분석: PostHog

### 왜 이 조합이 맞는가
- 별도 서버 상시 운영 비용이 없다
- 프론트 중심 구조에 작은 endpoint만 추가하면 된다
- 이벤트 저장과 오류 확인을 분리해서 시작할 수 있다
- 무료 구간 안에서 작게 검증하기 좋다

### 2026-04-19 기준 참고
- Cloudflare Workers Free: 100,000 requests/day
- Cloudflare D1 Free: 5 million rows read/day, 100,000 rows written/day, 5 GB storage
- Workers Logs Free: 200,000 log events/day, 3-day retention
- PostHog Free examples: Product Analytics 1 million events/month, Session Replay 5,000 recordings/month

Rule:
- 가격 정책은 바뀔 수 있으므로 실제 도입 직전에 다시 확인한다
- 초기에는 Session Replay를 전면 활성화하지 말고 샘플링한다
- 초기에는 Sentry 같은 추가 SaaS를 필수로 두지 않는다

## 10. 단계별 도입 순서
### Step 1. 최소 운영 이벤트
- submit / approval / result / error만 먼저 남긴다
- 여기서 사용 흐름과 실패 지점을 본다

### Step 2. follow-up / refinement 추적
- Stage 1 action이 실제로 학습에 도움 되는지 본다
- 어떤 후속 action이 눌리고 어디서 실패하는지 본다

### Step 3. 샘플링된 사용자 행동 분석
- PostHog로 이탈 구간과 반복 실패 흐름을 본다
- replay는 전수 대신 제한 샘플만 본다

### Step 4. 필요할 때만 심화
- 원문 저장 확대
- 고급 에러 수집
- 운영 대시보드
- cohort 분석

## 11. 나중에 구현할 때의 체크리스트
- 추적 로직이 제품 정체성을 블랙박스로 만들지 않는가
- 어떤 데이터가 정말 필요한지 먼저 분류했는가
- engine contract를 오염시키지 않았는가
- app 이벤트와 runtime 이벤트 경계가 분리되어 있는가
- 민감 입력이 기본적으로 남지 않도록 했는가
- 무료/저비용 구간에서 먼저 검증 가능한가

## 12. 현재 정리
제품화 단계에서 반드시 필요한 것은 "백엔드 자체"가 아니라 "운영 가능한 최소 관측 체계"다.

Vibe Studio는 아래 순서가 가장 안전하다.

1. 추적 목적을 문서로 고정한다
2. 프론트 중심 구조는 유지한다
3. 서버리스 endpoint와 저비용 DB로 이벤트만 먼저 모은다
4. 제품 분석은 행동 흐름 확인에 제한적으로 쓴다
5. 민감 입력 원문 저장은 별도 합의 전까지 기본 비활성으로 둔다

## 13. References
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare Workers Logs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- PostHog pricing overview: https://posthog.com/
