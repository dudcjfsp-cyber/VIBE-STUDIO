# TRD

Updated: 2026-04-10
Purpose: Vibe Studio MVP를 어떤 기술 구조와 계약으로 구현할지 정의한다.

## 1. 문서 목적과 상위 문서 관계
이 문서는 Vibe Studio MVP의 기술 설계 문서다.

이 문서는 아래 문서와 충돌하면 안 된다.
- `docs/product-intent.md`
- `docs/workflow-charter.md`
- `docs/approval-gate.md`
- `docs/golden-cases.md`
- `docs/PRD.md`
- `docs/engine-structure.md`
- `docs/minimum-contracts.md`

Rule:
- `docs/PRD.md`는 무엇을 만들지 고정한다
- 이 문서는 그것을 어떤 구조와 계약으로 구현할지 고정한다
- 판정 규칙의 상세는 `docs/approval-gate.md`를 따른다
- 행동 검증 기준은 `docs/golden-cases.md`를 따른다

## 2. 기술 목표
MVP의 기술 목표는 아래와 같다.
- 엔진 코어를 renderer-neutral하게 유지한다
- 앱의 사용자 경험과 엔진의 의미 해석을 분리한다
- `prompt`, `spec`, `architecture`, `review-report`를 같은 공통 handoff 위에서 지원한다
- approval gate를 규칙 우선, 점수 보조 방식으로 통합한다
- 초보자 입력에서도 explainable routing이 가능하게 한다
- golden cases 기준으로 동작 검증이 가능하게 한다

## 3. 기술 비목표
MVP에서 우선하지 않는 것은 아래와 같다.
- 사용자별 적응형 정책 엔진
- 계정 기반 개인화
- 실시간 협업
- 장기 저장/버전 관리
- 고급 모델 설정 UI
- 전문가용 세부 제어 기능
- 복잡한 플러그인 생태계
- 조직/권한 중심 기능

Rule:
- MVP는 기술적 유연성보다 구조적 명확성과 예측 가능성을 우선한다

## 4. 시스템 구성 개요
시스템은 네 층의 책임으로 나눈다.

- `App Layer`
  입력, 질문, 승인, 결과 표시를 담당한다
- `Workflow Policy Layer`
  approval, pivot, friction의 표현 강도를 결정한다
- `Engine Core`
  의미 해석, validation, gate signals, handoff 생성을 담당한다
- `Renderer Layer`
  공통 handoff를 특정 출력 형식으로 변환한다

Rule:
- app는 사용자 상호작용을 소유한다
- engine core는 의미 해석과 판정을 소유한다
- renderer는 출력 형식만 소유한다
- MVP에서는 `workflow policy`를 독립 패키지로 분리하지 않고 app/orchestrator 내부의 논리 계층으로 둔다

## 5. 패키지 구조
모노레포 기준 권장 구조는 아래와 같다.

- `apps/`
- `packages/engine-contracts`
- `packages/engine-core`
- `packages/renderer-prompt`
- `packages/renderer-spec`
- `packages/renderer-architecture`
- `packages/renderer-review-report`

Dependency rule:
- `engine-core`는 `engine-contracts`만 참조한다
- `renderer-*`도 `engine-contracts`만 참조한다
- app은 core와 renderers를 조합한다
- core는 특정 renderer 구현을 직접 소유하지 않는다

## 6. 핵심 계약
핵심 계약은 `docs/minimum-contracts.md`를 따른다.

MVP에서 중요한 계약은 아래와 같다.
- `SourceInput`
- `AnalysisDraft`
- `IntentIr`
- `ValidationReport`
- `RendererHandoff`
- `EngineRequest`
- `EngineResult`

Rule:
- `IntentIr`는 renderer-neutral해야 한다
- prompt/spec/architecture/review 전용 문장 재작성은 IR 안에 두지 않는다
- renderer-specific formatting은 각 renderer package 안에서만 처리한다
- 현재 renderer output baseline은 내부 계약과 validation 바닥선이지 최종 사용자-facing 제품 사양이 아니다

## 7. 핵심 실행 흐름
### Flow A. Create
1. app이 자유 입력과 optional card hint를 수집한다
2. engine이 `mode_guess`를 계산한다
3. engine이 provisional renderer를 추천한다
4. engine이 critical facts 여부를 판단한다
5. 부족하면 `clarify_first`를 반환한다
6. 충분하면 approval gate를 적용한다
7. app이 approval policy를 사용자에게 보여준다
8. 승인 또는 계속 진행이 확정되면 renderer를 실행한다
9. app이 결과와 이유를 함께 보여준다

### Flow B. Review
1. app이 기존 초안 또는 산출물을 수집한다
2. engine이 `review` mode를 우선 판단한다
3. artifact가 없으면 `clarify_first`
4. artifact가 있으면 `review-report` renderer를 실행한다
5. app이 검토 결과를 보여준다

### Flow C. Pivot
1. engine이 selected card와 inferred path를 비교한다
2. strong mismatch면 `pivot_recommended = true`
3. app이 전환 제안을 보여준다
4. app은 사용자 승인 없이 path를 조용히 바꾸지 않는다

## 8. Approval Gate 통합
상세 규칙은 `docs/approval-gate.md`를 따른다.

엔진은 최소한 아래 신호를 반환해야 한다.
- `mode_guess`
- `provisional_renderer`
- `missing_critical_facts`
- `ambiguity_score`
- `structure_score`
- `risk_score`
- `next_step`
- `approval_level`
- `pivot_recommended`
- `pivot_reason`
- `reason_codes`

Rule:
- strong rule override를 점수 해석보다 먼저 적용한다
- `clarify_first`는 approval보다 우선할 수 있다
- 점수는 총합 하나로 처리하지 않는다
- app은 신호를 표현하고, engine은 신호를 계산한다

## 9. Renderer 구조
각 renderer는 같은 `RendererHandoff`를 받아 각자의 출력 형식으로 변환한다.

renderer별 현재 최소 output shape와 validation 바닥선은 `docs/renderer-output-baseline.md`를 따른다.

MVP renderer:
- `prompt`
- `spec`
- `architecture`
- `review-report`

Renderer responsibilities:
- handoff 해석
- 출력 생성
- renderer-specific validation

Renderer non-responsibilities:
- `IntentIr` 재작성
- approval policy 변경
- app state 소유
- 사용자 상호작용 흐름 제어

## 10. 앱 / 정책 / 엔진 경계
### App responsibilities
- 입력 수집
- 카드 선택 UI
- 질문 표시
- 승인/진행 선택 UI
- 결과 렌더링
- pivot 제안 UI

### Workflow policy responsibilities
- `recommended`와 `required`의 UI 강도 결정
- pivot 제안 표현 결정
- friction 표현 강도 결정
- 사용자에게 보여줄 설명 수준 결정

### Engine responsibilities
- mode 판단
- provisional renderer 추천
- critical facts 판단
- approval gate signals 계산
- handoff 생성
- renderer 실행 결과 통합

Rule:
- app와 policy는 표현을 소유하고
- engine은 의미 판단을 소유한다

### Thin App boundary
`apps/prompt-web` 같은 thin app은 MVP에서 내부 수동 검증 surface로 취급한다.

Thin app의 역할:
- 엔진 신호와 renderer 최소 출력을 브라우저에서 빠르게 확인한다
- 비개발자 관점에서 질문, 승인, direct render, review 흐름을 수동 점검한다
- golden case와 renderer verify만으로 확인하기 어려운 연결 구간을 눈으로 검증한다

Thin app의 비역할:
- 최종 제품 프론트엔드 기준면이 아니다
- 제품 UX 사양이나 app wording source-of-truth가 아니다
- 저장, 히스토리, 협업 같은 제품 기능을 먼저 수용하는 기본 app이 아니다

Rule:
- thin app은 검증 도구로 유지하고, 기본적으로 제품형 app으로 확장하지 않는다
- thin app의 카피와 레이아웃은 검증 가독성을 위한 것이며 최종 제품 표현을 고정하지 않는다
- 실제 제품 프론트가 같은 검증 포인트를 안정적으로 대체하면 thin app은 축소하거나 제거할 수 있다
- thin app에 새 기능을 넣을 때는 제품 범위 확장이 아니라 검증 필요인지 먼저 설명해야 한다

## 11. 검증 전략
MVP 검증은 세 층으로 나눈다.

### Contract validation
- 필수 필드 존재 여부
- contract shape 일관성
- renderer-neutral contract 유지 여부

### Golden case validation
- `docs/golden-cases.md` 기준으로 mode, renderer, next_step, approval level, pivot behavior가 크게 어긋나지 않는지 확인한다
- golden case validation은 workflow baseline을 잠그는 용도이며, renderer-specific output density를 직접 고정하지 않는다

### Renderer output validation
- 각 renderer 결과가 최소 형식 조건을 만족하는지 확인한다
- 결과가 handoff의 의도와 명백히 충돌하지 않는지 확인한다
- review-report 같은 renderer의 설명 밀도와 actionable quality는 이 층에서 검증한다

Rule:
- 중요한 라우팅 변경은 golden case 기준 없이 바꾸지 않는다
- 비개발자도 행동 기준으로 검증할 수 있어야 한다
- workflow baseline과 renderer output baseline을 한 검증 층에 섞어 넣지 않는다

## 12. 구현 순서
1. `engine-contracts`
2. `engine-core` analyze flow
3. approval gate integration
4. `renderer-prompt`
5. `renderer-spec`
6. `renderer-architecture`
7. `renderer-review-report`
8. golden case verification loop
9. optional lightweight app only when a manual verification surface is needed

## 13. 오픈 이슈
- approval gate threshold의 세밀한 튜닝
- `review-report`의 결과 밀도 조정
- `docs/success-criteria.md` 분리 여부
- 이후 adaptive policy layer 확장 방식

