# Agent Stage 2 Implementation Plan

Updated: 2026-04-20
Purpose: Stage 2 agent를 구현 단계로 넘기기 위한 focused implementation plan

## Rule
- 이 문서는 source-of-truth 제품 문서가 아니라 Stage 2 구현 계획 노트다
- 이 문서는 `docs/product-intent.md`, `docs/workflow-charter.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/approval-gate.md`를 덮어쓰지 않는다
- 충돌이 보이면 상위 문서를 우선하고, 구현 전에 분류 후 멈춘다

## 1. 현재 시작 상태
현재 워크트리 기준으로 아래가 이미 정리되어 있다.

- Stage 1 post-result follow-up이 구현되어 있다
- `review-report`, `plan`, `architecture`에 결과 아래 action이 붙는다
- 원본 결과 비파괴, 결과당 follow-up 1개, silent switch 금지 경계가 유지된다
- 워크트리에 미커밋 임시 계획 변경은 없다

현재 기준 코드는 아래를 중심으로 본다.
- `packages/engine-contracts/src/stage1-follow-up.ts`
- `apps/product-server/src/run-stage1-follow-up.ts`
- `apps/product-web/src/features/studio/components/ResultPanel.tsx`

## 2. Stage 2 고정 경계
Stage 2는 아래 경계 안에서만 구현한다.

1. Stage 2는 별도 앞단 단계가 아니라 post-result layer 확장이다
2. `approval -> renderer -> agent` 순서를 유지한다
3. Stage 2는 결과 아래 action 선택 이후에만 시작된다
4. 대상 renderer는 `review-report`, `plan`, `architecture`만 포함한다
5. follow-up instruction은 action 이후의 bounded instruction으로만 연다
6. 후속 결과는 원본 결과를 덮어쓰지 않고 파생 결과로만 다룬다
7. 상태 구조는 `원본 결과 1개 + active follow-up 1개`로 유지한다
8. same renderer family 유지가 기본이며 silent switch를 금지한다
9. 자동 실행, 자동 체인, 앞단 decision layer 재개입은 Stage 2 범위 밖이다
10. 범위 밖 요청은 자동 전환하지 않고 경계 밖 요청으로 드러낸다

## 3. 구현 목표
Stage 2 구현의 목표는 아래 세 가지다.

1. Stage 1의 고정 action click-only follow-up을 bounded instruction 기반 반복 보완으로 확장한다
2. 기존 post-result 학습 흐름을 유지하면서 사용자가 같은 맥락 안에서 더 자연스럽게 이어서 수정할 수 있게 한다
3. 앞단 explainable routing, approval, clarify 구조를 건드리지 않고 후속 작업 유연성만 높인다

## 4. 비목표
이번 구현에서 아래는 다루지 않는다.

- `prompt` follow-up 기본 포함
- renderer 간 handoff 일반화
- `plan -> architecture` 같은 방향 전환
- 다중 follow-up branch
- 여러 후속 결과 stack
- agent 자율 체인
- approval, clarify, pivot, mode 재판정
- source-of-truth 문서의 광범위한 재정의

## 5. 권장 구현 전략
Stage 2는 Stage 1을 대체하는 큰 리라이트보다, Stage 1 실행 경로를 확장하는 방향이 안전하다.

권장 원칙:
- Stage 1 코드를 한 번에 일반화하지 않는다
- 기존 action registry와 follow-up request/result shape를 최대한 유지한다
- Stage 2에서 필요한 자유도는 instruction field와 same-block revision loop에 한정한다
- renderer family 유지 규칙은 contract와 UI 둘 다에서 드러나야 한다

## 6. 작업 스트림
### 6.1 Contracts
목표:
- Stage 2용 bounded instruction과 same-block revision을 담을 request/result shape를 추가한다
- Stage 1 고정 경계를 타입 수준에서 계속 드러낸다

권장 파일:
- `packages/engine-contracts/src/stage1-follow-up.ts`
- 필요 시 `packages/engine-contracts/src/stage2-follow-up.ts`
- `packages/engine-contracts/src/index.ts`

구현 방향:
- action 이후 instruction 입력 필드를 추가하되, freeform이 무제한 follow-up으로 읽히지 않게 naming을 보수적으로 둔다
- `max_follow_up_results = 1`, `keep_renderer_family = true` 같은 policy context는 유지한다
- review refinement의 기존 구조는 바로 제거하지 않고 Stage 2 공통 흐름과 공존시키는 쪽을 우선 검토한다

완료 조건:
- contract만 읽어도 Stage 2가 post-result bounded revision이라는 점이 드러난다
- Stage 1 경계가 약화되지 않는다

### 6.2 Product Server / Runtime
목표:
- action 이후 instruction을 받아 Stage 2 follow-up을 생성한다
- 범위 밖 요청을 조용히 처리하지 않고, 현재 경계 안에서만 생성하거나 명시적으로 막는다

권장 파일:
- `apps/product-server/src/run-stage1-follow-up.ts`
- follow-up API route 또는 서버 조합 파일

구현 방향:
- Stage 1 deterministic fallback과 structured generation 흐름을 재사용한다
- instruction이 비어 있어도 기존 Stage 1 action run은 계속 가능해야 한다
- instruction이 있어도 renderer family 전환이나 구현 단계 점프를 허용하지 않는다

완료 조건:
- 입력이 없어도 Stage 1 동작이 깨지지 않는다
- 입력이 있어도 Stage 2 경계 밖 생성으로 미끄러지지 않는다

### 6.3 Product Web
목표:
- 결과 아래 action 이후 bounded instruction 입력 경험을 붙인다
- 원본 결과와 active follow-up 1개 구조를 계속 눈에 보이게 유지한다

권장 파일:
- `apps/product-web/src/features/studio/components/ResultPanel.tsx`
- 필요 시 follow-up 관련 하위 컴포넌트

구현 방향:
- action 클릭 후 instruction 입력을 열되, black-box framing은 피한다
- 후속 결과는 계속 별도 블록으로 보여준다
- 같은 block 안에서 반복 보완이 가능해야 한다
- 범위 밖 요청은 현재 경계에서 처리할 수 없음을 명시한다

완료 조건:
- 사용자가 지금 원본 결과를 보고 있는지, 후속 보완을 하고 있는지 헷갈리지 않는다
- same renderer family 유지가 UX에서도 느껴진다

### 6.4 Verification
목표:
- Stage 2가 Stage 1 경계를 무너뜨리지 않았는지 확인한다
- post-result layer 전용 검증 기준을 최소한으로 추가한다

권장 파일:
- `docs/product-web-manual-checklist.md`
- `docs/observability-event-taxonomy.md`
- `docs/observability-foundation.md`
- 필요 시 post-result 검증 focused note

최소 확인 항목:
1. action 이전에는 instruction 입력이 열리지 않는다
2. 원본 결과가 사라지지 않는다
3. active follow-up 1개 구조가 유지된다
4. `plan` follow-up이 `architecture`로 점프하지 않는다
5. `architecture` follow-up이 구현 명세나 코드 생성으로 점프하지 않는다
6. 범위 밖 요청을 조용히 다른 흐름으로 처리하지 않는다

## 7. 권장 구현 순서
1. contracts shape 확장
2. server follow-up execution 확장
3. web result/follow-up UX 확장
4. 수동 검증 기준 업데이트
5. observability 최소 이벤트 보강

Rule:
- 앞 단계 경계가 확인되기 전 다음 단계를 크게 넓히지 않는다
- UI 문구 튜닝은 마지막에 하고, 경계 보존부터 먼저 확인한다

## 8. 구현 중 체크포인트
아래 중 하나가 실제로 바뀌면 source-of-truth 업데이트 여부를 다시 확인한다.

- workflow boundary
- golden-case behavior
- shared contracts
- renderer responsibility boundaries
- success criteria used for MVP acceptance

현재 판단:
- Stage 2 구현 계획 자체는 focused note로 충분하다
- 구현 중 post-result 검증 baseline이 확정되면 관련 문서 업데이트를 다시 검토한다

## 9. 현재 열린 항목
이번 계획 단계에서 아래는 열어둔다.

1. instruction 입력창을 action 직후 바로 열지, 첫 follow-up 이후에도 같은 방식으로 유지할지
2. 범위 밖 요청에 대해 재시작 CTA를 함께 줄지
3. review refinement를 Stage 2 공통 흐름에 어느 정도까지 흡수할지
4. post-result 검증 케이스를 기존 `docs/golden-cases.md`에 넣을지, 별도 focused note로 둘지

Rule:
- 이 항목들이 구현 도중 product identity, approval behavior, renderer boundary를 바꿀 정도로 커지면 분류부터 다시 한다

## 10. 구현 준비 판정
현재 기준으로 Stage 2는 구현 준비 상태로 본다.

이유:
- post-result 경계가 충분히 닫혔다
- Stage 1과의 호환 경로가 정리되었다
- 비범위와 위험선이 분명하다
- 바로 손댈 파일 경로와 검증 항목이 드러난다

현재 결론:
- 더 긴 설계 분해 없이 구현 단계로 넘어가도 된다
- 구현 시작 시에는 Stage 1 경계 보존 여부를 먼저 확인한다
