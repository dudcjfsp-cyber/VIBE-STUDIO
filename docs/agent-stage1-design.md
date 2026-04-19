# Agent Stage 1 Design

Updated: 2026-04-20
Purpose: Vibe Studio의 에이전트 도입 Stage 1에서 현재 유지되는 구현 경계와 설계 결정을 고정하는 focused design note

## Rule
- 이 문서는 source-of-truth 제품 문서가 아니라 stage 1 설계 노트다
- 이 문서는 `docs/product-intent.md`, `docs/workflow-charter.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/approval-gate.md`를 덮어쓰지 않는다
- 충돌이 있으면 상위 문서를 우선한다
- 본 문서는 Stage 1에서 이미 구현된 경계, action mapping, UX 흐름, 남은 open question을 계속 참조 가능한 형태로 고정하는 데 목적이 있다

## 1. Stage 1 목표
Stage 1의 목표는 에이전트를 앞단 판단 엔진으로 확대하지 않고, 결과 이후의 다음 행동 레이어로 붙이는 것이다.

이 단계에서 사용자가 체감해야 하는 변화:
- 결과를 받은 뒤 다시 처음부터 요청을 적지 않아도 된다
- 현재 결과를 바탕으로 다음 작업을 자연스럽게 이어갈 수 있다
- 왜 지금 agent가 실행되는지 이해할 수 있다

이 단계에서 유지해야 하는 것:
- Vibe Studio는 구조화 학습 환경이다
- approval, clarify, renderer 선택은 계속 explainable해야 한다
- silent switch와 black-box direction change는 금지한다

## 2. Stage 1 범위
Stage 1은 아래 세 흐름만 다룬다.

1. `review-report -> 지적 반영해서 다시 쓰기`
2. `plan -> 더 구체화하기`
3. `architecture -> 세부 설계로 확장하기`

Stage 1에서 제외하는 것:
- prompt 후속 액션
- renderer 간 일반 handoff 플랫폼화
- agent의 다단계 자율 체인
- agent가 approval, clarify, pivot을 다시 판단하는 흐름
- 사용자별 adaptive agent behavior

## 2.1 현재 구현 상태
Stage 1은 현재 아래 범위까지 구현된 상태로 본다.

- 결과 아래 action registry 노출
- renderer별 visibility rule 적용
- follow-up request bundle 생성
- 후속 결과 분리 표시
- `review-report` follow-up 보완 입력

현재 Stage 1 구현 기준은 아래 코드에서 직접 확인할 수 있다.
- `packages/engine-contracts/src/stage1-follow-up.ts`
- `apps/product-server/src/run-stage1-follow-up.ts`
- `apps/product-web/src/features/studio/components/ResultPanel.tsx`

## 3. 핵심 원칙
### 3.1 실행 순서 원칙
기본 순서는 아래를 유지한다.

1. input
2. engine analyze
3. clarify or approval if needed
4. renderer run
5. result display
6. user-selected agent action
7. agent follow-up result

Rule:
- `approval -> renderer -> agent` 순서를 깨지 않는다
- agent는 renderer 이전에 끼어들지 않는다

### 3.2 사용자 제어 원칙
- agent는 자동 실행하지 않는다
- 사용자가 결과 아래 action을 명시적으로 선택했을 때만 실행한다
- action 선택 전에는 기존 결과만 보여준다
- 사용자가 action을 고르기 전에는 후속 direction을 잠그지 않는다

### 3.3 결과 분리 원칙
- agent 결과는 기존 renderer 결과를 덮어쓰지 않는다
- agent 결과는 별도 후속 결과 블록으로 쌓는다
- 사용자는 원본 결과와 후속 결과를 구분해서 볼 수 있어야 한다

### 3.4 맥락 전달 원칙
Stage 1 agent는 아래 세 가지를 함께 본다.
- 원문 사용자 입력
- 1차 renderer 결과
- 사용자가 선택한 agent action

필요하면 renderer별 보조 맥락을 추가할 수 있지만, 앞단 gate 판단 로직을 다시 위임하지는 않는다.

## 4. Action Mapping
## 4.1 Review Report Action
### Action id
- `revise-from-review`

### User-facing label
- `지적 반영해서 다시 쓰기`

### 언제 노출하는가
- 현재 결과의 renderer가 `review-report`일 때
- `findings`가 1개 이상일 때
- review 결과가 정상 렌더된 상태일 때

### agent가 받는 핵심 입력
- 원문 artifact 또는 검토 대상 텍스트
- review verdict
- findings 목록
- 원래 사용자 요청

### 기대 결과
- findings를 반영한 수정안
- 어떤 지적을 반영했는지에 대한 짧은 반영 요약
- 남아 있을 수 있는 주의점

### Stage 1 해석 규칙
- 이 action은 `review`를 `create`로 조용히 바꾸는 것이 아니다
- 사용자가 review 결과를 본 뒤 명시적으로 선택한 후속 작업이다
- review renderer 자체는 계속 검토 리포트 역할만 유지한다

## 4.2 Plan Action
### Action id
- `expand-plan-detail`

### User-facing label
- `더 구체화하기`

### 언제 노출하는가
- 현재 결과의 renderer가 `plan`일 때
- `sections`가 validation 바닥선을 만족할 때

### agent가 받는 핵심 입력
- 원문 사용자 요청
- plan title
- plan sections
- notes와 assumptions에 해당하는 보조 맥락

### 기대 결과
- 더 구체적인 plan 초안
- 기존 plan에 없던 세부 항목
- 남은 공백 또는 추가 확인이 필요한 지점

### Stage 1 해석 규칙
- 이 action은 renderer를 바꾸지 않는다
- output은 여전히 plan 계열 후속 결과로 본다
- implementation spec, architecture, task breakdown 전체로 확장하는 범용 handoff로 해석하지 않는다

## 4.3 Architecture Action
### Action id
- `expand-architecture-detail`

### User-facing label
- `세부 설계로 확장하기`

### 언제 노출하는가
- 현재 결과의 renderer가 `architecture`일 때
- `system_boundary`, `components`, `interaction_flows`가 존재할 때

### Stage 1 기본 확장 초점
- 기본 초점은 `flow-detail`로 둔다
- 즉 현재 구조의 주요 흐름을 더 잘게 풀고, 관련 component 책임을 더 선명하게 하는 방향을 기본 세부화로 본다
- `API`, `data`, `operations` 중심 확장은 후속 단계 후보로 둔다

### agent가 받는 핵심 입력
- 원문 사용자 요청
- architecture 결과 전체
- system boundary
- component responsibilities
- interaction flows
- notes와 남은 가정

### 기대 결과
- 현재 구조를 더 세부적으로 풀어쓴 설계 결과
- 어떤 축으로 확장했는지에 대한 명시
- 이번 후속 결과에 포함하지 않은 범위

### Stage 1 해석 규칙
- 이 action은 코드를 만들거나 구현 계획으로 자동 전환하지 않는다
- architecture를 기술 명세로 일반화하는 단계는 Stage 1 범위 밖이다
- Stage 1에서는 "기존 architecture의 세부화"까지만 허용한다
- 기본 세부화 축은 `flow-detail`이며, 이를 조용히 다른 축으로 바꾸지 않는다

## 5. UX Flow Draft
## 5.1 공통 흐름
1. 사용자가 자유 입력한다
2. engine이 `mode_guess`, `provisional_renderer`, gate signals를 계산한다
3. `clarify_first`면 질문을 먼저 보여준다
4. `approval_pending`면 확인을 먼저 받는다
5. renderer가 1차 결과를 생성한다
6. app이 결과와 간단한 이유를 보여준다
7. app이 현재 renderer에 맞는 agent action을 결과 아래에 노출한다
8. 사용자가 action을 선택하면 그때 agent가 실행된다
9. app이 후속 결과를 원본 결과 아래 별도 블록으로 표시한다

## 5.2 Review 흐름
`start -> review-report result -> revise-from-review`

사용자 경험 의도:
- 먼저 문제를 이해한다
- 그 다음 수정안을 원할 때만 후속 작성을 요청한다
- 검토와 수정이 한 번에 뭉개지지 않는다

## 5.3 Plan 흐름
`start -> plan result -> expand-plan-detail`

사용자 경험 의도:
- 먼저 아이디어를 구조화한다
- 그 다음 더 촘촘한 기획 정리를 요청한다
- plan이 바로 architecture나 implementation checklist로 점프하지 않는다

## 5.4 Architecture 흐름
`start -> architecture result -> expand-architecture-detail`

사용자 경험 의도:
- 먼저 구조의 뼈대를 잡는다
- 그 다음 세부화를 요청한다
- 구조 설계와 구현 행동이 한 단계로 섞이지 않는다

## 6. App / Policy / Engine / Renderer / Agent 경계
## 6.1 App
App responsibilities:
- 결과 아래 action을 노출한다
- 어떤 action이 현재 결과에 적용 가능한지 계산된 값을 사용해 표시한다
- 원본 결과와 후속 결과를 분리해서 보여준다
- 사용자의 명시적 action 선택을 수집한다

App non-responsibilities:
- mode 재판정
- approval level 재계산
- agent가 생성할 내용 자체 판단

## 6.2 Workflow Policy
Workflow policy responsibilities:
- action 문구 강도와 설명 문구 톤 결정
- 후속 action을 어떤 표현으로 안내할지 결정
- `recommended`와 `required`의 차이를 계속 유지

Workflow policy non-responsibilities:
- agent input 해석을 대신 소유하지 않는다
- renderer 결과를 agent 결과로 자동 치환하지 않는다

## 6.3 Engine Core
Engine responsibilities:
- `create / review` 판단
- provisional renderer 추천
- critical facts 판단
- `clarify_first`, `approval_pending`, `pivot_recommended` 계산
- renderer handoff 생성

Engine non-responsibilities:
- agent action 추천 문구 소유
- result 이후 후속 action 흐름 제어
- 후속 result presentation 소유

## 6.4 Renderer
Renderer responsibilities:
- 1차 결과 생성
- renderer-specific validation

Renderer non-responsibilities:
- 후속 action 정의
- approval policy 변경
- agent용 재작성 정책 소유

## 6.5 Agent
Agent responsibilities:
- 사용자가 고른 후속 작업 1건 수행
- 원문과 기존 결과를 바탕으로 보완, 수정, 확장
- 후속 결과와 반영 요약 생성

Agent non-responsibilities:
- create/review 재판정
- renderer 자동 전환
- clarify/approval 판단 대체
- 여러 단계의 자율 작업 체인 실행

## 7. Execution Contract
이 섹션은 source-of-truth 계약 문서는 아니지만, 현재 Stage 1 구현이 따르는 안정된 shape를 설명한다.

## 7.1 Action Registry Entry
각 action은 최소한 아래 정보를 가져야 한다.

- `action_id`
- `supported_renderer`
- `user_label`
- `description`
- `visibility_rule`
- `input_bundle_rule`
- `result_kind`

현재 Stage 1 registry는 아래 세 항목만 포함한다.
- `revise-from-review`
- `expand-plan-detail`
- `expand-architecture-detail`

## 7.2 Agent Action Request Draft
- `source_text`
- `renderer`
- `primary_result`
- `selected_action`
- `result_context`
- `policy_context`

Rule:
- `policy_context`는 agent가 approval를 다시 계산하기 위한 값이 아니다
- 어떤 경계 안에서 후속 작업을 수행해야 하는지 설명하는 제한 맥락으로만 쓴다

## 7.3 Agent Result Draft
- `action_id`
- `result_title`
- `result_body`
- `change_summary`
- `remaining_questions`
- `source_result_ref`

현재 권장:
- `source_result_ref`를 유지해 어떤 1차 결과에서 파생된 후속 결과인지 드러낸다
- Stage 1의 최소 presentation shape는 `result_body + change_summary + remaining_questions`를 기본으로 한다

## 7.4 Stage 1 Default Decisions
현재 구현 기준으로 아래 기본값을 사용한다.

- agent는 action click 직후 바로 실행한다
- Stage 1에서는 freeform follow-up instruction을 받지 않는다
- `review-report` 후속 결과는 수정안 본문 + 반영 요약 + 남은 주의점으로 표시한다
- `plan` 후속 결과는 확장된 plan 본문 + 추가된 세부 항목 요약 + 남은 공백으로 표시한다
- `architecture` 후속 결과는 `flow-detail` 중심 세부 설계 + 확장 범위 요약 + out-of-scope로 표시한다
- agent 결과는 1차 결과를 대체하지 않고 항상 파생 결과로 표시한다

## 7.5 Readiness Decisions Absorbed
이 문서는 과거 readiness 메모에서 아래 결정을 흡수해 유지한다.

- `architecture` 세부화의 기본 초점은 `flow-detail`
- agent 결과 presentation 최소 구조는 `result_body + change_summary + remaining_questions`
- action 실행 전 설명은 짧은 1문장 수준으로 유지
- Stage 1에서는 결과당 후속 결과 1개만 허용
- Stage 1에서는 freeform follow-up instruction을 받지 않음
- agent 결과의 재귀 사용은 Stage 1 기본값으로 두지 않음
- 별도 lightweight approval 재도입은 Stage 1 기본값으로 두지 않음

## 8. Visibility Rules Draft
Stage 1에서는 action visibility를 단순하게 유지한다.

### 기본 규칙
- 결과가 없으면 action도 없다
- 현재 renderer에 해당하지 않는 action은 보이지 않는다
- validation 바닥선을 못 넘긴 불완전 결과에는 action을 붙이지 않는다

### renderer별 visibility
- `review-report`: findings 1개 이상일 때만 `revise-from-review`
- `plan`: section 구조가 있을 때만 `expand-plan-detail`
- `architecture`: boundary, component, flow가 있을 때만 `expand-architecture-detail`

## 9. Copy and Framing Principles
- action은 "결과 다음 행동"으로 보여야 한다
- "지금부터 agent가 알아서 처리한다" 같은 black-box framing은 피한다
- 사용자는 현재가 검토 단계인지, 후속 보완 단계인지 구분할 수 있어야 한다
- 후속 결과는 원본을 지우는 것이 아니라, 원본을 바탕으로 이어진 작업임이 드러나야 한다

## 10. Manual Verification
현재 Stage 1에서 아래 시나리오는 계속 수동 확인 가능해야 한다.

1. review 결과를 본 뒤 `지적 반영해서 다시 쓰기`를 눌렀을 때, 검토 리포트가 사라지지 않고 후속 수정안이 별도 블록으로 나온다
2. plan 결과에서 `더 구체화하기`를 눌렀을 때, 결과가 architecture로 점프하지 않는다
3. architecture 결과에서 `세부 설계로 확장하기`를 눌렀을 때, 코드 생성이나 구현 단계로 점프하지 않는다
4. `clarify_first` 상태에서는 agent action이 먼저 보이지 않는다
5. `approval_pending`이 필요한 입력은 approval 이전에 agent 단계로 우회되지 않는다
6. strong mismatch case에서도 agent가 renderer switch를 대신 처리하지 않는다

## 11. 남아 있는 열린 질문
Stage 1은 구현되었지만, 아래 항목은 후속 단계 설계 시 다시 검토할 수 있다.

1. `review-report` 기반 수정안 표현을 Stage 1 app-level presentation으로 유지할지, 별도 renderer shape로 올릴지
2. post-result case를 golden case 체계에 별도 편입할지
3. Stage 2 이상에서 freeform follow-up instruction을 어떤 경계로 열지
4. renderer 간 handoff를 언제부터 일반화할지

## 12. 현재 결론
Stage 1은 현재 아래 원칙으로 고정한다.

- post-result layer만 다룬다
- `approval -> renderer -> agent` 순서를 유지한다
- action은 결과 아래에서만 노출한다
- 후속 결과는 원본 결과를 덮어쓰지 않는다
- renderer family를 silent switch하지 않는다
- Stage 1에서는 freeform follow-up instruction을 받지 않는다
- 결과당 후속 결과는 1개만 허용한다
