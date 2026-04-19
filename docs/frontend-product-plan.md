# Frontend Product Plan

Updated: 2026-04-20
Purpose: 현재 `apps/product-web`의 제품 프론트 baseline과 남은 프론트 경계를 정리하는 focused note

## Rule
- 이 문서는 현재 제품 프론트의 baseline note다
- 이 문서는 source-of-truth 문서를 덮어쓰지 않는다
- 충돌이 있으면 `docs/product-intent.md`, `docs/workflow-charter.md`, `docs/PRD.md`, `docs/TRD.md`를 우선한다
- `apps/product-web`를 현재 제품 프론트 baseline으로 본다
- `apps/prompt-web`는 동결된 최소 검증 서페이스로만 유지한다

## 1. 현재 결정
- 현재 제품 프론트 baseline은 `apps/product-web`다
- 첫 화면은 입력 중심 구조를 유지한다
- 카드는 큰 진입 카드가 아니라 보조 힌트 수준으로 둔다
- create / review 구분은 첫 입력 이후 engine이 판단한다
- 수동 검증의 기본 기준면은 `product-web`로 둔다

## 2. 왜 이 방향인가
현재 MVP의 핵심 가치는 초보 사용자가 자연어로 바로 시작할 수 있다는 점이다.

따라서 첫 화면은:
- 무엇을 고를지 고민하게 만드는 화면보다
- 먼저 말해볼 수 있는 화면이어야 한다

이 판단은 아래 기준과 맞춘다.
- 첫 화면은 입력 중심이어야 한다
- 카드는 선택 보조장치여야 한다
- 시스템은 먼저 이해한 바를 비춰줘야 한다
- 초보자가 기술 용어를 몰라도 흐름을 따라갈 수 있어야 한다

## 3. 제품 프론트의 역할
`apps/product-web`은 아래를 담당한다.

- 자유 입력 시작점 제공
- 질문, 확인, 결과를 사용자 친화적인 UX로 번역
- engine signal을 사용자-facing 흐름으로 표현
- `prompt`, `plan`, `architecture`, `review-report` 결과를 서로 다른 성격으로 보여주기
- provider 선택, API key 입력, 모델 선택 UI 제공
- product runtime API를 호출하고, credential을 브라우저 세션 범위 안에서만 유지하기
- post-result follow-up과 학습 패널 같은 제품형 후속 UX 제공

아직 담당하지 않는 것:
- 저장/히스토리
- 협업
- adaptive policy
- 고급 사용자용 세밀한 제어

## 4. 런타임 경계
- `apps/product-web`은 브라우저 UX를 담당한다
- 브라우저는 provider key를 session storage에만 30분 동안 유지한다
- 실제 model/provider 호출은 `apps/product-server`가 요청 단위로 중계한다
- server runtime은 전달받은 key를 저장하지 않는다
- 브라우저는 server runtime API를 통해 결과와 모델 목록을 요청한다

## 5. 첫 화면 원칙
### 핵심 원칙
- 중앙 입력창 하나가 화면의 중심이어야 한다
- 사용자는 카드 선택 없이도 바로 시작할 수 있어야 한다
- 기술 용어보다 자연어 입력을 먼저 유도해야 한다
- 첫 화면에서 renderer 이름을 전면에 내세우지 않는다

### 허용되는 보조 요소
- 한 줄 설명
- 짧은 예시 입력
- 아주 약한 보조 액션
- 선택형 카드 대신 작은 hint chip

### 피해야 하는 것
- 첫 화면에서 네 가지 결과 방향을 큰 카드로 전면 배치
- 시작 전에 mode나 renderer를 강제 선택하게 하기
- 설명 텍스트가 입력창보다 더 눈에 띄는 구성
- 검증 도구처럼 보이는 상태 grid 노출

## 6. 현재 화면 구조
현재 제품 프론트는 아래 흐름을 가진다.

1. Start
- 자유 입력 중심
- 예시와 보조 힌트만 제공

2. Clarify
- `clarify_first`일 때 필요한 질문을 inline으로 보여줌
- 왜 질문하는지 짧게 설명

3. Approval
- `recommended`와 `required`를 서로 다른 강도로 보여줌
- 사용자가 진행 또는 입력 보완을 의식적으로 선택

4. Result
- renderer별 결과를 성격에 맞게 표시
- `prompt`에는 학습 패널을 붙일 수 있음
- `review`, `plan`, `architecture`에는 post-result follow-up을 붙일 수 있음

## 7. 제품 프론트와 검증 경계
과거 `apps/prompt-web`는 내부 검증 surface 역할을 맡았고, 현재도 동결된 최소 검증 서페이스로만 남겨둔다.

현재 기준:
- 브라우저 수동 검증의 기본 기준면은 `apps/product-web`
- `apps/prompt-web`는 low-level 확인이 필요할 때만 쓰는 fallback surface다
- 엔진 / renderer behavior baseline은 golden case와 verify 스크립트가 계속 보호
- 제품 프론트 수동 확인은 `docs/product-web-manual-checklist.md`를 기준으로 진행

Rule:
- thin app에는 새 기능을 붙이지 않는다
- thin app은 fallback 검증 용도만 유지한다
- 향후 제거는 `apps/prompt-web` 디렉터리와 serve script를 함께 걷어내는 방식으로 한다
- 만약 새 검증 surface가 필요해지면, `product-web`로 대체 불가능한 이유가 먼저 설명되어야 한다

## 8. renderer별 결과 표현 메모
### prompt
- 바로 복사/재사용 가능한 실행형 텍스트 중심
- 학습 패널은 결과 아래에 붙는다

### plan
- 문제, 대상, 방향, 열린 질문이 읽히는 구조화 문서형 결과

### architecture
- 경계, 구성요소, 흐름이 보이는 구조 설계형 결과

### review-report
- 문제점, 보완점, 다음 수정 포인트가 먼저 보이는 검토형 결과

## 9. 프론트 기준 남은 과제
- product-web 수동 체크리스트를 반복 가능한 루프로 돌리기
- 관측 이벤트를 실제 수집기로 연결하기
- 제품 프론트 회귀 검증을 더 강화하기
- 배포 구조를 실운영 기준으로 정리하기

## 10. 현재 결론
지금 가장 안전한 기준은:
- `product-web`를 제품 프론트 baseline으로 유지하고
- golden case / verify 스크립트로 엔진 baseline을 보호하며
- `prompt-web`는 동결된 최소 fallback 검증 서페이스로만 남겨두는 것이다.
