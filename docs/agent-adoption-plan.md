# Agent Adoption Plan

Updated: 2026-05-15
Purpose: Vibe Studio에 에이전트화를 도입할 때 어떤 경계에서 시작하고, 무엇을 아직 에이전트화하지 않을지 정리하는 focused note

## Rule
- 이 문서는 source-of-truth 제품 문서가 아니라 에이전트 도입 planning note다
- 이 문서는 `docs/product-intent.md`, `docs/workflow-charter.md`, `docs/PRD.md`, `docs/TRD.md`를 덮어쓰지 않는다
- 충돌이 있으면 상위 문서를 우선한다
- 현재 문서는 Stage 1 post-result action을 유지하되, Stage 2 이상 확장을 현재 제품 방향에서 철회한 이유를 기록한다

## 1. 배경
현재 Vibe Studio는 provider API를 통해 LLM을 호출하고, engine core가 mode, renderer, approval, clarify 흐름을 계산한 뒤 renderer가 1차 결과를 생성하는 구조를 갖고 있다.

이 구조는 Vibe Studio의 핵심 가치인:
- 구조화
- 학습
- 안내
- 명확화
를 유지하는 데 유리하다.

다만 결과가 나온 뒤의 후속 작업은 아직 상대적으로 단절되어 있다.
예를 들어:
- 검토 결과를 반영해 다시 쓰기
- 기획 정리를 더 구체화하기
- 구조 설계를 세부 설계로 확장하기
같은 작업은 사용자가 다시 처음부터 요청을 적어야 하는 경우가 많다.

에이전트 도입의 목적은 이 후속 작업 구간을 더 자연스럽게 이어주는 데 있다.

## 2. 기본 원칙
에이전트는 Vibe Studio의 중심 판단 엔진이 아니라 후속 작업 레이어로 도입한다.

즉 기본 구조는 아래를 유지한다.
- engine core: 의미 해석과 신호 계산
- renderer: 1차 결과 생성
- agent: 결과 이후 보완, 수정, 확장

Rule:
- 앞단 판단을 agent에게 넘기지 않는다
- explainable routing과 approval 구조를 유지한다
- agent는 "대신 다 해주는 블랙박스"가 아니라 "다음 작업을 도와주는 워커"로 둔다

## 3. 에이전트화하지 않을 영역
아래는 당분간 에이전트화하지 않는다.

- `create / review` 판별
- provisional renderer 추천
- critical facts 판단
- `clarify_first` 여부 판단
- `approval_pending`와 `recommended / required` 판단
- card mismatch와 pivot recommendation 계산

이유:
- 이 영역은 제품의 explainability를 지키는 핵심이다
- 사용자가 왜 질문을 받는지 이해할 수 있어야 한다
- 사용자 승인 없이 조용히 방향이 바뀌면 안 된다

## 4. 에이전트화 후보의 현재 상태
에이전트는 결과 이후의 후속 작업에서 가장 먼저 가치가 난다.
다만 현재 제품 방향에서는 후보를 넓히지 않고 Stage 1에서 이미 구현된 세 흐름만 유지한다.

### 4.1 Prompt 후속 작업
현재 활성 범위가 아니다.

- 더 짧게 만들기
- 더 엄격하게 만들기
- few-shot 버전으로 바꾸기
- 특정 상황용으로 다시 다듬기

### 4.2 Plan 후속 작업
현재 활성 범위는 `더 구체화하기` 한 가지다.

- MVP 범위로 압축하기
- 핵심 사용자와 문제를 더 선명하게 하기
- 실행 순서 추가하기
- 빠진 항목을 보완하기

### 4.3 Architecture 후속 작업
현재 활성 범위는 기존 architecture 결과의 flow-detail 세부화까지다.
아래 확장은 현재 제품 방향에서 철회한다.

- API 초안으로 확장하기
- 데이터 모델 수준으로 확장하기
- 권한/운영 관점으로 다시 정리하기
- 리스크 중심으로 재정리하기

### 4.4 Review Report 후속 작업
현재 활성 범위는 `지적 반영해서 다시 쓰기` 한 가지다.

- 지적사항을 반영한 수정안 만들기
- 심각도 높은 문제부터 다시 정리하기
- 더 안전한 표현으로 재작성하기

## 5. 1차 도입 범위
초기 도입은 아래 3개를 우선 후보로 둔다.

1. `review-report -> 지적 반영해서 다시 쓰기`
2. `plan -> 더 구체화하기`
3. `architecture -> 세부 설계로 확장하기`

이 범위를 먼저 권장하는 이유:
- 사용자가 체감하는 다음 행동이 분명하다
- 현재 흐름을 크게 흔들지 않는다
- 결과 이후의 agent 역할이 명확하게 보인다

## 6. 권장 구조
에이전트 도입 후 권장 구조는 아래와 같다.

1. 사용자가 자유 입력
2. engine이 mode, renderer, approval, clarify를 계산
3. renderer가 1차 결과 생성
4. app이 결과 하단에 후속 작업 액션 노출
5. 사용자가 액션 선택
6. 그때만 agent 실행
7. agent가 후속 결과 생성

정리:
- engine = 방향 판단
- renderer = 1차 결과
- agent = 후속 작업

## 7. UX 방향
에이전트는 별도 복잡한 모드가 아니라 "결과 다음 행동"으로 보이는 것이 좋다.

예시 액션:
- 더 구체화하기
- 더 짧게 만들기
- 지적 반영하기
- 다음 단계로 넘기기
- 다른 형태로 바꾸기

renderer별 예시:
- plan: `더 구체화하기`
- architecture: `세부 설계로 확장하기`
- review-report: `지적 반영해서 다시 쓰기`

Rule:
- 에이전트 액션은 기존 결과 아래에 맥락적으로 붙인다
- 현재 결과를 사용자 승인 없이 다른 renderer로 자동 전환하지 않는다
- prompt 후속 작업, API/data/operation 확장, renderer 간 handoff는 현재 활성 후보가 아니다

## 8. Approval와의 관계
approval는 유지한다.
에이전트가 approval를 대체하면 안 된다.

원칙:
- approval는 1차 결과 이전의 안전장치
- agent는 1차 결과 이후의 후속 작업 도우미

기본 순서:
- approval -> renderer -> agent

## 9. 단계별 로드맵
### Phase 1. 결과 후속 액션
현재 유지 범위다.

- 결과 하단에 에이전트 액션 노출
- 단일 결과를 받아 단일 후속 결과 생성

### Phase 2. 수정 루프
현재 제품 방향에서 철회한다.

- 사용자가 후속 지시를 입력
- 에이전트가 기존 결과를 받아 재작성

### Phase 3. Renderer 간 handoff
현재 제품 방향에서 철회한다.

- `plan -> architecture`
- `review-report -> revised draft`
- `architecture -> implementation checklist`

### Phase 4. 장기 과제
현재 제품 방향에서 철회한다.

- 다단계 작업 체인
- 작업 맥락 유지
- 후속 액션 자동 추천

Rule:
- Phase 1만 현재 유지한다
- Phase 2 이상은 다음 작업 후보로 보지 않는다

## 10. 피해야 할 방향
아래는 피하는 것이 좋다.

- 처음부터 끝까지 알아서 처리하는 agent
- approval 없이 renderer를 바꾸는 흐름
- clarify / approval 자체를 agent가 대신 판단하는 구조
- 사용자가 이유를 알 수 없는 자동 전환

이런 방향은 Vibe Studio를 구조화 학습 환경이 아니라 범용 생성기로 밀어버릴 위험이 있다.

## 11. 권장 agent 역할 정의
초기에는 agent 역할을 단순하게 가져간다.

### Refine Agent
- 더 짧게
- 더 명확하게
- 더 실전형으로

### Expand Agent
- 더 구체적으로
- 다음 단계까지 확장
- 세부 항목 추가

### Revise Agent
- 검토 결과 반영
- 문제 수정
- 표현 개선

## 12. 남은 결정사항
현재 결정된 항목:
- agent 결과는 기존 결과 위에 덮어쓰지 않고 후속 결과로 분리한다
- agent는 원문과 기존 결과를 함께 본다
- 후속 결과에는 별도 approval gate를 두지 않는다
- 사용자에게는 내부 단계명이 아니라 "결과 다음 행동"으로 설명한다

아직 남은 항목:
- `review-report` 기반 수정안 표현을 app-level presentation으로 둘지, renderer shape로 올릴지
- post-result case를 golden case 체계에 별도 편입할지

## 13. 현재 결론
현재 유지하는 에이전트 도입점은 아래 세 가지뿐이다.

- `review-report` 결과 아래 `지적 반영해서 다시 쓰기`
- `plan` 결과 아래 `더 구체화하기`
- `architecture` 결과 아래 `세부 설계로 확장하기`

이 단계에서는:
- 기존 engine 유지
- approval 유지
- renderer 유지
- agent는 후속 작업에만 한정

Stage 2 이상의 수정 루프, renderer handoff, 장기 chain은 현재 철회한다.
이 방향이 AI 입문자에게 API 연결과 agent 운용을 요구하지 않으면서도, 결과 다음 행동을 학습하게 만드는 현재 제품 정체성에 가장 잘 맞는다.
