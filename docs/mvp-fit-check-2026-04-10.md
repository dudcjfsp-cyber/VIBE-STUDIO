# MVP Fit Check

Updated: 2026-04-10 21:05 +09:00
Purpose: 현재 구현이 `docs/success-criteria.md` 기준으로 어디까지 충족되었는지 기록한다.

Rule:
- 이 문서는 source-of-truth를 덮어쓰지 않는다
- 이 문서는 현재 상태 판정과 근거를 기록하는 상태 보고 문서다

## 1. 판정 요약
현재 상태는 `MVP 합격 선언 가능`으로 본다.

이유:
- golden case와 renderer verify 기준 행동은 모두 통과했다
- thin app이 이제 4개 renderer의 최소 출력을 한 surface에서 보여주도록 확장됐다
- 브라우저 기준 수동 확인에서도 질문, 승인, direct render, review, card mismatch 흐름이 기대대로 동작했다

## 2. 통과 근거
### Workflow / Gate
- `npm.cmd run typecheck` 통과
- `npm.cmd run verify:golden-cases` 통과
- Product Core Case 1~6에서 `mode_guess`, `provisional_renderer`, `next_step` 기대값을 맞춘다
- Gate Regression Case 7~9에서 `approval_level`, `pivot_recommended`, `clarify_first` / `approval_pending` 경계를 맞춘다
- silent switch 사례는 확인되지 않았다

### Renderer Coverage
- `npm.cmd run verify:prompt-cycle`에서 direct render와 approval gating 흐름을 확인했다
- `npm.cmd run verify:spec-renderer`에서 `recommended` 승인 후 `spec` output 1개와 `ready` validation을 확인했다
- `npm.cmd run verify:architecture-renderer`에서 `required` 승인 후 `architecture` output 1개와 `ready` validation을 확인했다
- `npm.cmd run verify:review-renderer`에서 direct review render, `needs-revision` verdict, actionable finding 2개를 확인했다
- review output은 findings / recommendation 구조를 사용해 create output과 다른 성격을 가진다

## 3. 수동 확인 근거
### Beginner Experience
- [`apps/prompt-web`](C:\Users\dudcj\OneDrive\바탕 화면\vive studio\apps\prompt-web)는 카드 optional, 이유 설명, 질문/승인 흐름을 보여준다
- `prompt` 입력은 `direct_render`로 바로 output이 생성되는 것을 확인했다
- `spec` 입력은 `approval_pending + recommended`로 두 버튼이 노출되고, 승인 후 `Structured Plan Draft` output이 생성되는 것을 확인했다
- `architecture` 입력은 범위가 비어 있을 때 `clarify_first` 질문으로 멈추는 것을 확인했다
- `architecture` follow-up 입력은 `approval_pending + required` 후 output이 생성되는 흐름을 확인했다
- `review-report` 입력은 `Verdict`, `findings`, `recommendation` 구조를 가진 review 결과가 생성되는 것을 확인했다
- `Prompt Help` 카드를 먼저 선택해도 review 요청에서는 `review-report`로 라우팅되고 mismatch 안내가 드러나는 것을 확인했다

### Product Verdict Boundary
- `docs/renderer-output-baseline.md`는 내부 output/validation baseline으로 유지하기로 정리됐다
- 하지만 이번 라운드에서는 thin app surface를 기준으로 비개발자 관점 수동 확인까지 완료했다
- 따라서 renderer baseline을 제품 사양으로 승격하지 않아도, 현재 MVP 합격 여부는 제품 행동 기준으로 판정 가능하다

## 4. 현재 판단
- engine/workflow MVP baseline: 통과
- renderer baseline coverage: 통과
- beginner-visible product surface: 수동 확인 통과
- 전체 MVP 합격 선언: 가능

## 5. 문서상 다음으로 진행 가능한 경계
지금부터 더 진행해도 되는 작업은 아래 범위다.

- renderer 결과 표현을 더 읽기 쉽게 다듬는 작업
- review-report 결과 밀도와 finding 구조를 더 정교하게 만드는 작업
- thin app을 수동 검증 surface로 더 명확히 정리하는 작업
- renderer verify 스크립트 공통화 같은 내부 정리 작업
- `docs/success-criteria.md`를 흔들지 않는 범위의 품질 개선 작업

지금 세션에서 바로 더 나아가면 안 되는 경계는 아래다.

- 제품 정체성 변경
- approval behavior 변경
- create/review routing 기준 변경
- card/renderer/mode 경계 재정의
- renderer baseline을 조용히 최종 제품 사양으로 승격하는 작업
- adaptive policy, 저장/히스토리, 협업 같은 Post-MVP 범위 진입
