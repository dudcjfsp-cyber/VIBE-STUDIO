# Success Criteria

Updated: 2026-04-09
Purpose: Vibe Studio MVP가 제품적으로 합격인지 판단하는 기준을 정의한다.

## 1. 문서 목적
이 문서는 Vibe Studio MVP가 구현되었다를 넘어, 의도한 방향으로 충분히 작동한다고 볼 수 있는 최소 합격선을 고정한다.

이 문서는 기능 목록을 늘리기 위한 문서가 아니다.
이 문서는 멈출 기준과 통과 기준을 정하는 문서다.

## 2. 상위 문서 관계
이 문서는 아래 문서와 충돌하면 안 된다.
- `docs/product-intent.md`
- `docs/workflow-charter.md`
- `docs/approval-gate.md`
- `docs/golden-cases.md`
- `docs/PRD.md`
- `docs/TRD.md`
- `docs/glossary.md`

## 3. 판정 규칙
Rule:
- 이 문서는 코드 품질이 아니라 제품 행동을 기준으로 판정한다
- 이 문서는 비개발자도 확인 가능한 기준으로 읽어야 한다
- 기능이 존재하더라도 제품 정체성을 해치면 합격으로 보지 않는다
- 세부 완성도가 조금 부족해도 핵심 흐름과 제품 성격이 맞으면 합격 가능하다
- 문서 간 충돌이 있으면 더 상위 문서를 우선한다
- MVP 합격은 아래 두 조건을 모두 만족해야 한다:
  - 모든 Product Core Case가 핵심 판정에서 통과한다
  - Gate Regression Case에서 blocking failure가 없다
- MVP 불합격은 아래 6번 섹션의 항목 중 하나라도 충족하면 선언한다

## 4. 이 문서가 판정하는 대상
이 문서는 아래를 판정한다.
- MVP가 AI 입문자 기준으로 충분히 이해 가능한가
- 시스템의 라우팅, 질문, 승인 흐름이 일관되게 작동하는가
- 제품이 범용 생성기가 아니라 사고 구조화 학습 환경으로 느껴지는가
- 핵심 문서 기준과 실제 동작이 크게 어긋나지 않는가

이 문서는 아래를 직접 판정하지 않는다.
- 코드의 미학
- 내부 구현의 우아함
- 장기 확장성의 완성도
- 후속 버전의 고급 기능 포함 여부

## 5. MVP 성공 기준
MVP는 아래 기준이 모두 충족되면 성공으로 본다.

### 5.1 Product Core Golden Cases
- `docs/golden-cases.md`의 모든 Product Core Case가 기대 `mode_guess`를 맞춰야 한다
- 모든 Product Core Case가 기대 `provisional_renderer`를 맞춰야 한다
- 모든 Product Core Case가 기대 `next_step`을 맞춰야 한다
- review 관련 Product Core Case는 create로 잘못 라우팅되면 안 된다

### 5.2 Gate Regression Cases
- `docs/golden-cases.md`의 모든 Gate Regression Case가 기대 `next_step`을 맞춰야 한다
- Gate Regression Case에서 기대 `approval_level`이 필요한 경우, 실제 경험에서도 그 강도가 구분되어야 한다
- mismatch case에서는 `pivot_recommended`가 빠지면 안 된다
- 어떤 regression case에서도 silent switch가 발생하면 안 된다
- architecture follow-up regression case에서는 critical facts가 채워진 뒤에도 `clarify_first`에 머물면 안 된다

### 5.3 Renderer Coverage
- 프롬프트 (`prompt`) 결과 방향은 기대 renderer가 `prompt`인 golden case에서 최소 1회 성공해야 한다
- 기획형 구조 정리 (`spec`) 결과 방향은 기대 renderer가 `spec`인 golden case에서 최소 1회 성공해야 한다
- 구조 설계 (`architecture`) 결과 방향은 기대 renderer가 `architecture`인 golden case에서 최소 1회 성공해야 한다
- 검토 리포트 (`review-report`) 결과 방향은 기대 renderer가 `review-report`인 golden case에서 최소 1회 성공해야 한다
- review 결과는 생성 결과와 성격이 분명히 달라야 한다

### 5.4 Beginner Experience
- 초보 사용자가 카드 없이도 시작할 수 있어야 한다
- 카드는 보조 장치로 느껴져야 하며, 필수 입장 절차처럼 느껴지면 안 된다
- 사용자는 왜 질문을 받는지, 왜 바로 생성되지 않는지를 한 문장 수준으로 설명할 수 있어야 한다
- 마찰은 처벌보다 도움으로 느껴져야 한다
- 제품은 사용자의 생각을 대신 덮어쓰는 느낌보다 함께 정리해주는 느낌을 줘야 한다

### 5.5 Document Alignment
- approval behavior는 `docs/approval-gate.md`와 충돌하지 않아야 한다
- app, policy, core, renderer의 경계는 `docs/workflow-charter.md`와 `docs/TRD.md`를 크게 벗어나지 않아야 한다
- 용어 사용은 `docs/glossary.md`와 충돌하지 않아야 한다

## 6. MVP 불합격 기준
아래 중 하나라도 확인되면 MVP는 아직 불합격으로 본다.

- Product Core Case 하나라도 기대 `mode_guess`, `provisional_renderer`, `next_step` 중 하나가 틀린다
- Gate Regression Case 하나라도 기대 `next_step`이나 `approval_level`을 만족하지 못한다
- 어떤 mismatch case에서든 silent switch가 발생한다
- review 관련 Product Core Case에서 create로 잘못 라우팅된다
- `recommended`와 `required`의 차이가 실제 경험에서 구분되지 않는다
- 초보 사용자가 왜 질문을 받는지, 왜 바로 생성되지 않는지를 설명하지 못한다
- 결과가 대부분 비슷한 생성기처럼 느껴져 구조화 학습 경험이 사라진다

## 7. 허용 가능한 미완성
아래는 MVP에서 완벽하지 않아도 허용 가능하다.
- approval threshold의 세밀한 튜닝
- renderer별 결과 완성도 차이
- 문장 표현의 세부 다듬기
- 숙련 사용자용 최적화
- adaptive policy
- 저장, 히스토리, 협업 기능

Rule:
- 핵심 흐름과 제품 정체성이 맞다면, 세부 완성도는 후속 단계에서 개선할 수 있다

## 8. 검증 방법
MVP는 아래 기준으로 검증한다.
- `docs/golden-cases.md` 기준 행동 검증
- 주요 흐름별 수동 점검
- 대표 사용자 입력에 대한 실제 결과 확인
- 비개발자 기준 설명 가능성 확인

검증 질문 예시:
- 왜 이 질문이 나왔는지 설명 가능한가
- 왜 이 방향이 추천됐는지 이해 가능한가
- 왜 이 경우는 바로 생성되지 않았는가
- review와 create의 차이가 실제로 느껴지는가

## 9. 후속 단계로 넘길 것
아래는 MVP 성공 이후 다음 단계에서 다룬다.
- adaptive approval behavior
- 더 많은 golden case 추가
- 결과 형식별 정교한 품질 기준
- 저장, 프로젝트 관리, 협업 기능
- 고급 사용자용 제어 기능

