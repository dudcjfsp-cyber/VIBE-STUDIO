# Roadmap

Updated: 2026-04-10
Purpose: Vibe Studio MVP 구현의 실행 순서와 각 단계의 완료 기준을 간단히 정리한다.

## Rule
- 이 문서는 실행 순서를 정리하는 문서다
- 제품 범위는 `docs/PRD.md`를 따른다
- 기술 구조는 `docs/TRD.md`를 따른다
- 행동 기준은 `docs/golden-cases.md`와 `docs/success-criteria.md`를 따른다
- 이 문서는 상위 문서를 덮어쓰지 않는다

## Phase 0. Baseline Freeze
Goal:
- 구현 시작 전 source-of-truth 문서를 고정한다

Includes:
- `docs/product-intent.md`
- `docs/workflow-charter.md`
- `docs/approval-gate.md`
- `docs/golden-cases.md`
- `docs/PRD.md`
- `docs/TRD.md`
- `AGENTS.md`
- `docs/success-criteria.md`
- `docs/glossary.md`
- `docs/engine-structure.md`
- `docs/minimum-contracts.md`

Done when:
- 구현에 필요한 상위 기준과 용어 정의가 모두 존재한다
- 새 세션 에이전트가 읽기 순서와 우선순위를 따라 시작할 수 있다

## Phase 1. Engine Contracts
Goal:
- 공통 계약을 코드 파일로 옮긴다

Includes:
- `SourceInput`
- `AnalysisDraft`
- `IntentIr`
- `ValidationReport`
- `RendererHandoff`
- `EngineRequest`
- `EngineResult`

Done when:
- shared contract가 한 곳에 모여 있다
- renderer-neutral contract 원칙이 깨지지 않는다

## Phase 2. Engine Core Analyze Flow
Goal:
- 입력을 분석하고 mode, provisional renderer, gate signals를 계산하는 코어 흐름을 만든다

Includes:
- create / review 구분
- provisional renderer recommendation
- critical facts detection
- approval gate signal calculation

Done when:
- engine이 최소 신호 세트를 반환할 수 있다
- `docs/approval-gate.md`의 strong rule override와 기본 흐름이 코드로 반영된다

## Phase 3. Prompt Renderer + Thin App
Goal:
- 가장 얇은 end-to-end 흐름을 먼저 성립시킨다

Includes:
- 자유 입력 화면
- clarify flow
- approval flow
- `prompt` renderer
- 결과 표시

Rule:
- thin app은 이 단계부터 제품 프론트가 아니라 내부 검증 surface로 취급한다
- 이후 renderer가 늘어나도 thin app은 검증 역할을 우선하고, 제품형 app의 기본 경로로 승격하지 않는다

Done when:
- 사용자 입력 -> 질문/확인 -> prompt 결과 생성의 한 사이클이 동작한다
- 적어도 prompt 관련 golden case를 일부 검증할 수 있다

## Phase 4. Spec Renderer
Goal:
- 아이디어 구조화 흐름을 추가한다

Includes:
- `spec` renderer
- 관련 validation
- 관련 golden case 확인

Done when:
- idea structuring 계열 입력이 `spec`으로 안정적으로 연결된다

## Phase 5. Architecture Renderer
Goal:
- 구조 설계 흐름을 추가한다

Includes:
- `architecture` renderer
- 관련 validation
- 관련 golden case 확인

Done when:
- structure-heavy beginner inputs가 `architecture` 경로로 안정적으로 연결된다

## Phase 6. Review-Report Renderer
Goal:
- review mode를 완성한다

Includes:
- `review-report` renderer
- artifact present / missing 흐름
- 관련 golden case 확인

Done when:
- review-first routing이 안정적으로 동작한다
- review와 create가 실제 경험에서 구분된다

## Phase 7. Golden Case Verification Loop
Goal:
- 문서 기준과 실제 동작을 맞춘다

Includes:
- Product Core Case 검증
- Gate Regression Case 검증
- approval/pivot/routing mismatch 수정

Done when:
- `docs/success-criteria.md`의 핵심 합격 조건을 만족한다
- blocking failure가 남아 있지 않다

## Phase 8. MVP Fit Check
Goal:
- 현재 상태가 MVP 합격선에 도달했는지 판단한다

Includes:
- renderer output baseline을 내부 검증 계약으로 유지할지 여부를 정리한 상태에서 판단
- thin app을 내부 수동 검증 surface로 유지한다는 경계를 명시한 상태에서 판단
- beginner experience 점검
- doc alignment 점검
- success criteria 판정

Done when:
- renderer baseline의 지위가 source-of-truth 문서에 명시되어 있다
- `docs/success-criteria.md` 기준으로 MVP 합격 여부를 선언할 수 있다

## Post-MVP Candidates
These are not part of the initial roadmap baseline:
- adaptive approval behavior
- more golden cases
- richer renderer formatting rules
- saved history and project management
- collaboration features
- advanced controls for power users

