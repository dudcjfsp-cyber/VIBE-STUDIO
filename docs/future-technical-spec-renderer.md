# Future Technical-Spec Renderer

Updated: 2026-04-14
Purpose: MVP 이후 별도 `technical-spec` renderer 확장 가능성을 메모해두기 위한 focused note

## Rule
- 이 문서는 현재 MVP 범위를 바꾸지 않는다
- 이 문서는 현재 source-of-truth 문서를 덮어쓰지 않는다
- 현재 `plan` renderer의 의미를 조용히 바꾸지 않는다
- 현재 `architecture` renderer의 책임을 조용히 넓히지 않는다

## 1. 현재 판단
현재 Vibe Studio MVP에서 `plan`은 기획 정리 결과다.
이 결과는 문제, 대상, 방향, 열린 질문을 구조화하는 데 초점을 둔다.

따라서 일반적인 개발 문맥에서 기대하는 기술 명세형 `spec`과는 다르다.
이 차이는 버그가 아니라 현재 제품 정의의 결과다.

하지만 후속 단계에서는 아래와 같은 별도 renderer가 유의미할 수 있다.
- renderer id 후보: `technical-spec`
- user-facing 이름 후보: `기술 명세`

## 2. 왜 별도 renderer여야 하는가
`technical-spec`은 현재 `plan`과 다루는 질문이 다르다.

`plan`이 답하는 질문:
- 무엇을 만들려는가
- 누구를 위한가
- 왜 필요한가
- 어떤 방향과 범위를 먼저 잡아야 하는가

`architecture`가 답하는 질문:
- 어떤 시스템 경계와 구성요소가 필요한가
- 책임과 상호작용 흐름은 어떻게 나뉘는가

`technical-spec`이 답해야 하는 질문:
- 어떤 기능 요구사항이 확정되었는가
- 비기능 요구사항은 무엇인가
- 입력/출력/상태/예외는 어떻게 정의되는가
- acceptance criteria는 무엇인가
- 구현 전에 무엇이 명세로 잠겨야 하는가

Rule:
- `technical-spec`은 `plan`의 상세 버전으로 취급하지 않는다
- `technical-spec`은 `architecture`의 텍스트 설명 버전으로 취급하지 않는다
- 별도 renderer로 분리해 각 결과 방향의 역할을 유지한다

## 3. 예상 사용자 가치
후속 단계에서 `technical-spec`이 유용해지는 시점은 아래와 같다.
- 사용자가 아이디어 정리를 넘어서 실제 기능 명세를 원할 때
- 팀이나 개발자에게 넘길 요구사항 문서가 필요할 때
- 구현 전에 acceptance criteria를 고정하고 싶을 때
- `plan` 결과만으로는 너무 추상적이고, `architecture`만으로는 요구사항 잠금이 부족할 때

## 4. 현재 MVP와의 경계
현재 MVP는 아래 네 가지 결과 방향만 포함한다.
- `prompt`
- `plan`
- `architecture`
- `review-report`

`technical-spec`은 현재 MVP 결과 방향이 아니다.

Rule:
- golden case, success criteria, approval behavior를 `technical-spec` 기준으로 재해석하지 않는다
- 현재 `plan` renderer를 기술 명세처럼 보이게 만들기 위해 출력 의미를 확장하지 않는다
- 현재 `architecture` renderer에 요구사항 목록 책임을 밀어넣지 않는다

## 5. 나중에 설계할 때 필요한 최소 질문
`technical-spec`을 실제로 추가하기 전에 최소한 아래를 먼저 고정해야 한다.

### Product
- 이 결과 방향이 AI 입문자에게도 이해 가능한가
- `plan`과의 차이를 사용자에게 설명 가능한가
- 기본 진입이 자유 입력인 상태에서 언제 `technical-spec`을 추천할 것인가

### Routing
- 어떤 입력을 `plan`이 아니라 `technical-spec`으로 보내는가
- `technical-spec`은 언제 `clarify_first`를 우선해야 하는가
- `technical-spec`은 기본적으로 `recommended` 승인인지 `required` 승인인지

### Contracts
- renderer output shape를 어디까지 고정할 것인가
- acceptance criteria, requirements, constraints, out-of-scope를 필수 필드로 둘 것인가
- architecture와 공유하는 handoff 정보만으로 충분한가

## 6. 초안 output shape 메모
아래는 현재 결정이 아니라, 나중에 검토할 수 있는 초안 메모다.

- `title: string`
- `scope_summary: string`
- `functional_requirements: Array<{ id: string; requirement: string }>`
- `non_functional_requirements: string[]`
- `constraints: string[]`
- `acceptance_criteria: string[]`
- `open_questions: string[]`
- `notes: string[]`

Rule:
- 위 shape는 메모일 뿐 현재 계약이 아니다
- 실제 추가 시에는 별도 baseline 문서와 검증 규칙이 필요하다

## 7. 추천 진행 순서
나중에 이 확장을 실제로 시작할 때는 아래 순서를 권장한다.
1. 제품 정의상 `technical-spec`이 필요한지 먼저 확정
2. `plan` / `architecture` / `technical-spec`의 경계 문서화
3. golden case 추가
4. success criteria 영향 검토
5. renderer output baseline 초안 작성
6. 구현 시작

## 8. 현재 결론
현재는 `plan`을 유지한다.
기술 명세형 결과가 필요해지면 `plan`을 변형하지 말고 `technical-spec` renderer를 별도로 추가하는 방향이 가장 안전하다.
