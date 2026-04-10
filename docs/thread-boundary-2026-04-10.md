# Thread Boundary

Updated: 2026-04-10
Purpose: 이번 스레드에서 안전하게 진행할 작업 범위와 금지 범위를 먼저 고정한다.

## 1. 이 문서의 역할
- 이 문서는 이번 스레드의 작업 경계를 정리하는 임시 운영 메모다
- source-of-truth 문서를 대체하지 않는다
- 제품 방향, 승인 정책, 라우팅 기준을 새로 결정하지 않는다

## 2. 우선 참조 문서
이번 스레드의 판단은 아래 문서를 기준으로 한다.

- `docs/PRD.md`
- `docs/TRD.md`
- `docs/approval-gate.md`
- `docs/success-criteria.md`
- `docs/renderer-output-baseline.md`
- `docs/mvp-fit-check-2026-04-10.md`
- `docs/handoff-2026-04-10.md`

Rule:
- 충돌이 있으면 위 문서를 우선한다
- 이 문서는 이번 스레드의 안전장치일 뿐이다

## 3. 이번 스레드의 기본 판단
- 현재 상태는 `MVP 합격 가능` 기준으로 본다
- thin app은 최종 제품 프론트가 아니라 내부 검증 surface로 유지한다
- renderer output baseline은 최종 사용자-facing 제품 사양이 아니라 내부 output/validation baseline으로 유지한다
- golden case와 renderer verify를 깨는 변경은 기본적으로 금지한다

## 4. 이번 스레드에서 허용하는 작업
- renderer 결과 표현의 가독성 개선
- `review-report` finding 구조와 설명 품질 개선
- thin app을 검증 surface로 더 명확히 드러내는 정리
- verify 스크립트의 중복 축소와 검증 흐름 정리
- 문서 간 경계 설명 보강
- 인코딩 문제처럼 작업 안정성을 해치는 문서/표현 문제 수정

## 5. 이번 스레드에서 금지하는 작업
- 제품 정체성 변경
- approval behavior 규칙 변경
- create/review routing 기준 변경
- renderer baseline을 최종 제품 사양으로 승격하는 작업
- thin app을 기본 제품 프론트로 확장하는 작업
- adaptive policy, 저장, 히스토리, 협업 같은 Post-MVP 범위 진입
- golden case 기대값을 먼저 바꾸고 구현을 맞추는 식의 기준 이동

## 6. 작업 전 체크포인트
각 작업은 아래 질문을 통과해야 한다.

1. 이 변경이 workflow baseline을 바꾸는가
2. 이 변경이 MVP 합격 판정을 다시 흔드는가
3. 이 변경이 thin app을 검증 surface가 아니라 제품 surface처럼 만들고 있는가
4. 이 변경이 renderer baseline을 최종 사양처럼 고정하고 있는가
5. 이 변경을 golden case와 renderer verify로 바로 확인할 수 있는가

Rule:
- 위 질문 중 하나라도 `예`이면 먼저 범위 재확인이 필요하다

## 7. 이번 스레드의 안전한 기본 순서
1. 문서 기준과 현재 구현의 충돌 여부를 먼저 본다
2. 표현/구조 개선처럼 경계를 넘지 않는 작업부터 처리한다
3. 변경 후 `typecheck`, `verify:golden-cases`, 관련 renderer verify로 회귀를 확인한다
4. 경계를 넘는 이슈가 발견되면 즉시 멈추고 별도 결정 항목으로 분리한다

## 8. 현재 추천 시작점
이번 스레드에서 가장 안전하게 시작할 수 있는 후보는 아래 두 가지다.

- `review-report`의 finding 품질과 actionable recommendation 정리
- thin app이 검증 surface라는 점을 문서와 UI에서 더 분명히 정리

## 9. 완료 조건
이번 스레드의 준비 단계는 아래가 되면 끝난다.

- 무엇을 수정해도 되는지와 안 되는지가 한 문서로 정리되어 있다
- 다음 작업이 경계를 넘는지 빠르게 판정할 수 있다
- 이후 구현 변경은 이 문서를 체크리스트처럼 참조할 수 있다
