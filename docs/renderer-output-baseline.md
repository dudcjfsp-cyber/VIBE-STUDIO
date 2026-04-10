# Renderer Output Baseline

Updated: 2026-04-10
Purpose: 현재 renderer layer의 최소 출력 형식과 validation 바닥선을 고정한다.

## 1. 문서 역할
이 문서는 renderer별 현재 최소 출력 구조를 고정한다.

이 문서는:
- 최종 사용자-facing 표현을 확정하는 문서가 아니다
- app UI wording을 정의하는 문서가 아니다
- engine contract를 다시 정의하는 문서가 아니다

Rule:
- 상위 우선순위는 `docs/product-intent.md`, `docs/workflow-charter.md`, `docs/approval-gate.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/minimum-contracts.md`를 따른다
- 이 문서는 renderer package가 지금 어떤 최소 결과를 내야 하는지와 어떤 최소 validation을 통과해야 하는지를 고정한다
- 이 문서는 현재 renderer baseline을 최종 제품 사양으로 승격하지 않는다

## 2. 공통 규칙
- 모든 renderer는 공통 `RendererHandoff`만 입력으로 받는다
- renderer-specific output shape는 각 renderer package 안에서만 정의한다
- app는 renderer output을 어떻게 보여줄지 소유하지만, output shape 자체는 renderer가 소유한다
- 최소 출력 형식은 내부 baseline이며, 이후 제품 표현 고도화와 동일하지 않을 수 있다
- output validation은 analysis validation과 분리된 별도 단계다

현재 결정:
- renderer baseline은 내부 최소 계약이자 검증 바닥선으로 유지한다
- 이 문서에 적힌 field 이름, section title, notes wording은 최종 사용자-facing 문구를 고정하지 않는다
- 최종 제품 표현 사양이 필요해지면 별도 제품/표현 문서에서 결정하고, 이 문서를 조용히 제품 사양으로 간주하지 않는다

검증 책임:
- golden case 검증은 mode, provisional renderer, next step, approval level, pivot 같은 workflow baseline을 본다
- renderer verify는 renderer가 실제로 최소 output shape와 설명 밀도를 만족하는지 본다
- golden case는 renderer-specific content density를 직접 고정하지 않는다

## 3. Prompt Baseline
패키지:
- `packages/renderer-prompt`

현재 최소 출력 형식:
- `title: string`
- `prompt: string`
- `notes: string[]`

현재 최소 의미:
- `title`은 결과 이름이다
- `prompt`는 바로 재사용 가능한 실행형 텍스트다
- `notes`는 mode, summary, risk 같은 보조 설명을 담을 수 있다

현재 validation 바닥선:
- `title`은 비어 있지 않는 것이 권장된다
- `prompt`는 비어 있으면 안 된다

## 4. Spec Baseline
패키지:
- `packages/renderer-spec`

현재 최소 출력 형식:
- `title: string`
- `sections: Array<{ title: string; bullets: string[] }>`
- `notes: string[]`

현재 최소 의미:
- `sections`는 구조화된 기획형 정리 단위다
- 현재 baseline에서는 최소한 문제, 대상, 방향을 설명할 수 있는 섹션 묶음을 기대한다
- section title wording은 현재 내부 baseline이며 최종 제품 문구로 고정하지 않는다

현재 validation 바닥선:
- `title`은 비어 있지 않는 것이 권장된다
- `sections`는 최소 3개 이상이어야 한다
- 모든 section은 비어 있지 않은 `title`을 가져야 한다
- 모든 section은 최소 1개 이상의 bullet을 가져야 한다

## 5. Architecture Baseline
패키지:
- `packages/renderer-architecture`

현재 최소 출력 형식:
- `title: string`
- `system_boundary: string`
- `components: Array<{ name: string; responsibility: string }>`
- `interaction_flows: Array<{ name: string; steps: string[] }>`
- `notes: string[]`

현재 최소 의미:
- `system_boundary`는 현재 구조 설계가 어디까지를 다루는지 밝힌다
- `components`는 주요 구성요소와 책임을 분리해서 보여준다
- `interaction_flows`는 최소 한 개 이상의 주요 상호작용 흐름을 보여준다
- clarification이 남아 있는 경우 현재 baseline에서는 추가 flow로 드러날 수 있다

현재 validation 바닥선:
- `title`은 비어 있지 않는 것이 권장된다
- `system_boundary`는 비어 있으면 안 된다
- `components`는 최소 3개 이상이어야 한다
- 모든 component는 `name`과 `responsibility`를 가져야 한다
- `interaction_flows`는 최소 1개 이상이어야 한다
- 모든 flow는 `name`을 가져야 한다
- 모든 flow는 최소 2개 이상의 step을 가져야 한다

## 6. Review Report Baseline
패키지:
- `packages/renderer-review-report`

현재 최소 출력 형식:
- `title: string`
- `verdict: "needs-revision" | "usable-with-fixes"`
- `findings: Array<{ severity: "high" | "medium" | "low"; title: string; detail: string; recommendation: string }>`
- `notes: string[]`

현재 최소 의미:
- `verdict`는 검토 결과의 요약 판정이다
- `findings`는 문제 지적만이 아니라 개선 권고까지 포함해야 한다
- `notes`는 review mode, confidence, artifact excerpt 같은 보조 맥락을 담을 수 있다

현재 최소 설명 밀도:
- direct review render에서는 최소 1개 이상의 actionable finding이 있어야 한다
- 각 finding은 무엇이 문제인지와 무엇을 보완해야 하는지를 분리해서 설명해야 한다
- artifact가 지나치게 짧거나 핵심 맥락이 비어 있으면, verdict는 그 부족함이 반영되는 방향이어야 한다
- underspecified artifact 예시에서는 최소 한 개 이상의 `medium` 이상 finding이 나와야 한다
- review 결과는 create 결과처럼 새 산출물을 대신 작성하는 톤보다, 현재 초안의 약점과 보완 포인트를 드러내는 톤이어야 한다

현재 validation 바닥선:
- `title`은 비어 있지 않는 것이 권장된다
- `findings`는 최소 1개 이상이어야 한다
- 모든 finding은 `title`, `detail`, `recommendation`을 가져야 한다

## 7. 비목표
이 문서는 아직 아래를 고정하지 않는다.
- renderer 결과를 app에서 어떤 시각 구조로 보여줄지
- 사용자-facing 한국어 문구를 어떤 톤으로 고정할지
- markdown, rich text, card layout 같은 presentation format
- renderer별 품질 상한선

## 8. 다음 판단 포인트
이 baseline이 다음에 바뀌는 경우는 아래뿐이다.
- renderer output shape가 실제로 달라질 때
- validation 바닥선이 달라질 때
- 별도 사용자-facing output spec 문서가 생겨 app/renderer 표현 경계를 다시 고정할 때
