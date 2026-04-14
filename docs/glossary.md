# Glossary

Updated: 2026-04-09
Purpose: Vibe Studio에서 반복되는 핵심 용어의 뜻을 고정하고, 문서와 구현 전반의 해석 충돌을 줄인다.

## 1. 문서 목적
이 문서는 Vibe Studio의 주요 용어를 같은 뜻으로 사용하기 위한 기준 문서다.

이 문서는:
- 제품 문서
- 기술 문서
- 에이전트 운영 문서
사이의 해석 충돌을 줄이기 위해 존재한다.

## 2. 사용 규칙
Rule:
- 같은 용어는 같은 뜻으로 사용한다
- 다른 뜻이 필요하면 새 용어를 만든다
- 낮은 우선순위 문서에서 용어를 임의로 재정의하지 않는다
- 헷갈리는 경우 이 문서를 먼저 기준으로 삼되, 상위 문서와 충돌하면 상위 문서를 따른다
- 비공식 표현보다 이 문서의 표준 용어를 우선 사용한다

## 3. 진입과 작업 성격 용어
### Card
앱 첫 화면에서 보이는 사용자-facing 선택 카드.

Rule:
- card는 UI element다
- 의미상 `track`과 연결되지만, 동일한 기술 개념으로 쓰지 않는다

### Card Hint
사용자가 선택한 card를 app이 engine에 전달하기 위해 정규화한 신호.

Rule:
- card hint는 engine-facing signal이다
- card 자체와 동일한 UI 개념으로 쓰지 않는다

### Track
앱에서 사용자에게 보이는 진입 선택지의 의미 단위.
예: 아이디어 정리, 프롬프트 만들기, 구조 설계, 검토

Rule:
- track는 사용자-facing 개념이다
- engine contract의 중심 개념으로 쓰지 않는다

### Mode
세션의 기본 작업 성격.
현재 기본 mode는 `create`, `review` 두 가지다.

Rule:
- mode는 task posture를 뜻한다
- track, card, renderer와 같은 뜻으로 쓰지 않는다

### Create
새 결과를 만들기 위한 기본 mode.

### Review
기존 초안이나 산출물을 평가하고 검토하기 위한 기본 mode.

Rule:
- review는 create의 하위 옵션이 아니라 별도 mode다

### Path
`path`는 비공식 포괄 표현으로만 쓴다.
가능하면 `track`, `mode`, `renderer`, `result direction` 중 정확한 용어를 선택해 쓴다.

Rule:
- 공식 문서에서는 `path`보다 더 구체적인 표준 용어를 우선한다

## 4. 출력과 판정 용어
### Result Direction
사용자-facing 결과 방향을 가리키는 제품 용어.
MVP에서 결과 방향과 renderer family는 아래처럼 1:1로 대응한다.
- 프롬프트 = `prompt`
- 기획 정리 = `plan`
- 구조 설계 = `architecture`
- 검토 리포트 = `review-report`

Rule:
- PRD와 success criteria에서는 user-facing 설명을 위해 result direction 표현을 사용할 수 있다
- 기술 문서와 구현 계약에서는 renderer id를 우선 사용한다

### Renderer
공통 handoff를 특정 결과 형식으로 바꾸는 출력 계층.
예: `prompt`, `plan`, `architecture`, `review-report`

Rule:
- renderer는 출력 형식의 책임을 가진다
- app entry choice나 mode와 같은 뜻으로 쓰지 않는다

### Provisional Renderer
최종 확정 전, 시스템이 현재 입력을 바탕으로 임시 추천하는 renderer.

Rule:
- provisional renderer는 recommendation이다
- user approval 없이 자동 확정되지 않는다

### Strong Renderer Mismatch
사용자가 고른 card hint가 암시하는 방향과 시스템이 해석한 renderer가 세부 차이가 아니라 작업 성격 자체에서 다른 상태.

예:
- `prompt` card hint를 골랐지만 실제 요청은 `review`
- `prompt` card hint를 골랐지만 실제 요청은 `architecture`

Rule:
- mismatch는 detail difference가 아니라 work posture difference일 때만 강하게 본다

### Pivot Recommended
현재 선택보다 다른 방향이 더 적절하다고 시스템이 제안하는 신호.

Rule:
- `pivot_recommended`는 signal이다
- `strong renderer mismatch` 같은 조건을 바탕으로 발생할 수 있다
- silent switch를 정당화하지 않는다

## 5. Approval / Routing 용어
### Critical Facts
현재 provisional renderer 기준으로 책임 있는 결과를 만들기 위해 꼭 필요한 정보.

Rule:
- 없으면 기본적으로 `clarify_first`
- 있으면 더 좋아지는 정도의 정보는 기본적으로 critical facts가 아니다

### Ambiguity
시스템이 현재 입력을 하나의 방향으로 안전하게 잠글 수 있는지의 불확실성.

Rule:
- ambiguity는 direction lock의 문제다
- critical facts는 responsible output의 문제다
- 두 용어를 같은 뜻으로 쓰지 않는다

### Next Step
현재 시점에서 시스템이 권하는 다음 단계.

현재 기본값:
- `direct_render`
- `clarify_first`
- `approval_pending`

### Direct Render
추가 질문이나 승인 없이 바로 결과 생성으로 진행 가능한 상태.

### Clarify First
최종 렌더링이나 방향 확정보다 먼저 질문과 정보 보완이 필요한 상태.

### Approval Pending
최종 결과 생성 전에 한 번 더 확인 단계가 필요한 상태.

Rule:
- `approval_pending`은 next step이다
- `recommended`와 `required`는 이 상태 안의 강도 값이다

### Approval Level
`approval_pending` 안에서 확인 강도를 나누는 값.
현재 기본값은 `recommended`, `required`

### Recommended
진행은 가능하지만, 한 번 확인하면 결과가 더 좋아질 가능성이 큰 상태.

Rule:
- `recommended`는 soft checkpoint다
- passive banner처럼 취급하지 않는다

### Required
명시적 확인 없이는 최종 생성으로 넘어가면 안 되는 상태.

Rule:
- `required`는 실제 block이다
- `recommended`와 같은 강도로 취급하지 않는다

### Reason Codes
시스템이 현재 판정을 왜 내렸는지 설명하기 위한 구조화된 이유 코드.

Rule:
- reason codes는 내부 신호와 UI 설명을 연결하는 보조 장치다
- 제품 정책을 직접 정의하는 값은 아니다

## 6. 계층 용어
### App Layer
입력, 질문, 승인, 결과 표시를 담당하는 사용자 상호작용 계층.

### Workflow Policy
승인, 피벗, 마찰, 표현 강도를 다루는 규칙 계층.

Rule:
- workflow policy는 사용자 경험의 강도를 결정한다
- engine core의 의미 해석과 같은 뜻으로 쓰지 않는다

### Engine Core
입력 해석, intent IR, validation, approval gate signals, renderer handoff 생성을 담당하는 중심 계층.

Rule:
- engine core는 renderer-neutral해야 한다
- UI 표현을 직접 소유하지 않는다

### Renderer Layer
공통 handoff를 실제 결과 형식으로 바꾸는 출력 계층.

Rule:
- renderer layer는 형식을 소유한다
- approval behavior나 UI 흐름을 소유하지 않는다

## 7. 기술 구조 용어
### Analysis Draft
초기 분석 결과를 담는 중간 표현.
Intent IR 이전 단계의 분석형 초안이다.

Rule:
- analysis draft는 최종 공유 계약이 아니다
- renderer-specific scaffolding을 담지 않는다

### Intent IR
renderer-neutral한 의미 계약.
입력의 의도와 구조를 downstream renderer가 공유할 수 있게 만든 표현.

Rule:
- IR 안에는 renderer-specific phrasing을 넣지 않는다
- IR은 shared semantic layer다

### Renderer Handoff
engine core가 renderer에 넘기는 공통 입력 묶음.

Rule:
- renderer는 handoff를 기반으로 출력한다
- handoff는 특정 renderer 전용 구조로 오염되면 안 된다

### Validation Report
분석이나 출력이 충분히 준비되었는지, 어떤 문제가 있는지 알려주는 구조화된 보고.

Rule:
- validation report는 pass/fail만이 아니라 issue explanation도 담는다

## 8. 문서 운영 용어
### Golden Case
대표 입력과 기대 동작을 고정한 행동 검증 사례.

Rule:
- golden case는 구현 예시가 아니라 behavioral baseline이다
- 중요한 routing/approval 변경은 golden case 기준과 함께 봐야 한다

### Product Core Case
타깃 사용자와 핵심 제품 경험을 대표하는 golden case.

### Gate Regression Case
routing, approval, risk, pivot 경계를 보호하기 위한 회귀용 사례.

### Handoff
다음 세션이 시작될 때 잃기 쉬운 작업 경계와 맥락을 전달하는 짧은 인수인계.

Rule:
- handoff는 changelog dump가 아니다

## 9. 금지된 혼용 표현
- track와 renderer를 같은 뜻으로 쓰지 않는다
- card와 track를 완전히 같은 기술 개념처럼 쓰지 않는다
- card와 card hint를 같은 층으로 다루지 않는다
- mode와 renderer를 같은 뜻으로 쓰지 않는다
- approval gate와 workflow policy를 같은 뜻으로 쓰지 않는다
- review를 renderer가 아니라 mode라는 점을 흐리지 않는다
- intent IR와 renderer output을 같은 층으로 다루지 않는다
- `recommended`를 단순 안내 배너로 축소하지 않는다
- golden case를 구현 샘플 코드처럼 다루지 않는다
