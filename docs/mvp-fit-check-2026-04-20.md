# MVP Fit Check

Updated: 2026-04-20
Purpose: 현재 Vibe Studio가 source-of-truth 기준으로 MVP 합격선을 어디까지 충족하는지, 그리고 무엇이 아직 제품화 준비 항목으로 남아 있는지 최신 상태로 기록한다.

## Rule
- 이 문서는 source-of-truth를 덮어쓰지 않는다
- 이 문서는 현재 상태 판정과 근거를 기록하는 상태 보고 문서다
- 충돌이 있으면 `docs/product-intent.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/success-criteria.md`를 우선한다

## 1. 판정 요약
현재 상태는 아래처럼 나눠 보는 것이 가장 정확하다.

- engine / workflow MVP baseline: `합격`
- renderer coverage baseline: `합격`
- product-web 학습형 제품 프론트 baseline: `거의 합격`
- 외부 사용자 대상 제품화 준비: `진행 중`

정리:
- Vibe Studio는 문서가 정의한 코어 MVP 목표에는 사실상 도달했다
- 다만 "MVP 달성"과 "외부 공개 가능한 운영 준비"는 같은 상태가 아니다

## 2. 이번 판정의 기준
이번 판정은 아래 문서를 기준으로 삼는다.

- `docs/product-intent.md`
- `docs/workflow-charter.md`
- `docs/approval-gate.md`
- `docs/golden-cases.md`
- `docs/PRD.md`
- `docs/TRD.md`
- `docs/success-criteria.md`
- `docs/frontend-product-plan.md`
- `docs/prompt-help-learning-panel.md`

## 3. 통과 근거
### 3.1 Workflow / Gate
아래 기준은 현재도 통과 상태로 본다.

- create / review 구분이 작동한다
- provisional renderer 추천이 작동한다
- `clarify_first`, `approval_pending`, `direct_render` 구분이 유지된다
- `recommended`와 `required`가 workflow signal 수준에서 구분된다
- strong mismatch에서 `pivot_recommended`가 유지된다
- silent switch가 확인되지 않았다

검증 근거:
- `npm.cmd run typecheck` 통과
- `npm.cmd run build --silent` 통과
- `node ./scripts/verify-golden-cases.mjs` 통과

현재 golden case 결과:
- Product Core Case 1~6 통과
- Gate Regression Case 7~9 통과

### 3.2 Renderer Coverage
아래 renderer coverage는 현재 충족한다.

- `prompt`
- `plan`
- `architecture`
- `review-report`

검증 근거:
- `node ./scripts/verify-plan-renderer.mjs` 통과
- `node ./scripts/verify-architecture-renderer.mjs` 통과
- `node ./scripts/verify-review-renderer.mjs` 통과

확인된 경계:
- review 결과는 create 결과와 구조가 다르다
- `architecture`는 boundary / components / flow 구조를 유지한다
- `plan`은 section 기반 구조를 유지한다
- `review-report`는 verdict / finding / recommendation 구조를 유지한다

### 3.3 Product-Web Surface
`apps/product-web`는 더 이상 단순 아이디어 수준이 아니라 실제 제품 프론트 baseline 역할을 시작한 상태다.

현재 확인되는 것:
- 자유 입력 시작
- optional hint chip
- clarify inline UX
- approval panel
- renderer별 결과 표현
- prompt help 학습 패널
- Stage 1 post-result follow-up
- review refinement 입력
- approval revise 입력 보완 UX
- provider session 30분 유지

검증 근거:
- `npm.cmd run build:product-web --silent` 빌드 통과
- `node ./scripts/verify-agent-stage1.mjs` 통과

### 3.4 Stage 1 Post-Result Agent
Stage 1 범위는 현재 구현 및 검증 완료 상태로 본다.

지원 흐름:
- `review-report -> revise-from-review`
- `plan -> expand-plan-detail`
- `architecture -> expand-architecture-detail`

유지되는 경계:
- `approval -> renderer -> agent` 순서 유지
- action은 결과 아래에서만 노출
- 후속 결과는 원본을 덮어쓰지 않고 분리 표시
- freeform follow-up instruction 미도입
- 결과당 후속 결과 1개 제한 유지

## 4. 현재 상태에서 MVP 합격으로 보는 이유
`docs/success-criteria.md` 기준으로 보면 아래 항목들이 충족된다.

### Product Core Golden Cases
- 기대 `mode_guess` 충족
- 기대 `provisional_renderer` 충족
- 기대 `next_step` 충족
- review 관련 case가 create로 잘못 라우팅되지 않음

### Gate Regression Cases
- 기대 `next_step` 충족
- 기대 `approval_level` 충족
- mismatch case에서 `pivot_recommended` 유지
- architecture follow-up case가 critical facts 이후 `approval_pending`으로 이동

### Renderer Coverage
- 4 renderer 모두 최소 1회 이상 검증 성공
- review output이 create output과 다르게 유지됨

### Beginner Experience
- 카드 없이 시작 가능
- 카드는 보조 힌트 수준으로 존재
- 질문/승인 이유를 사용자-facing 문장으로 설명하는 UX가 존재
- 결과가 단순 생성기처럼 한 덩어리로 나오지 않음

## 5. 아직 남아 있는 갭
이번 상태는 "MVP 미달"이라기보다 "제품화 마감 전 갭"으로 보는 편이 정확하다.

### 5.1 운영 관측
- `docs/observability-foundation.md`는 생겼다
- 하지만 실제 추적 로직은 아직 없다
- 현재는 운영 데이터 없이 수동 검증과 스크립트 검증 중심이다

### 5.2 Product-Web 수동 검증 반복 루프
- `docs/product-web-manual-checklist.md`는 생겼다
- 다만 이 체크리스트를 실제 회귀 루프로 반복 실행하는 체계는 아직 약하다
- 브라우저 수동 점검 결과를 주기적으로 다시 잠그는 작업이 남아 있다

### 5.3 외부 공개 준비
- 배포 구조는 아직 실운영 기준으로 닫히지 않았다
- 로그, 오류 수집, 세션 흐름 기록 체계가 없다
- 제품화 이후 운영 판단은 아직 문서 준비 단계다

### 5.4 Product-Web 회귀 검증
- 엔진/renderer 검증은 강하다
- 반면 `product-web` 자체의 화면 흐름 회귀는 상대적으로 약하다

## 6. 현재 판단
현재 Vibe Studio는 아래처럼 분류하는 것이 가장 안전하다.

1. 코어 MVP는 이미 합격선에 도달했다
2. product-web은 MVP를 사용자-facing 학습 경험으로 번역하는 단계까지 거의 왔다
3. 이제 남은 일은 새 기능 대거 추가보다:
   - 최신 판정 갱신
   - 수동 검증 기준 고정
   - 관측/운영 준비 고정
   - 배포/운영 루프 준비

## 7. 다음 작업 경계
지금 가장 자연스러운 다음 작업은 아래 순서다.

1. `product-web` 기준 수동 테스트 체크리스트 고정
2. 관측 이벤트 taxonomy 고정
3. 최소 추적 로직 설계와 구현 시작
4. 제품 프론트 회귀 검증 루프 강화

## 8. 결론
현재 상태는 "MVP를 계속 만들고 있는 중"이라기보다, "MVP를 제품으로 닫는 단계"에 들어선 상태다.

따라서 다음 우선순위는 새 renderer나 새 정책보다:
- 최신 상태 재판정
- 제품 프론트 기준 수동 검증
- 운영 관측 준비
를 고정하는 것이 더 맞다.
