# Handoff

Updated: 2026-05-15
Purpose: 다음 작업자가 현재 main의 제품 경계와 남은 결정만 빠르게 잡기 위한 짧은 기준.

## Current Baseline
- Branch: `main`
- Latest pushed commit: `e8a8bc5 Merge branch 'codex/review-renderer-learning-pass'`
- Browser verification surface: `apps/product-web`
- Frozen fallback surface: `apps/prompt-web`

## Current Product Boundary
- Vibe Studio는 프롬프트 생성기나 코딩 지시 생성기가 아니라, AI 입문자가 의도, 맥락, 빠진 정보, 작업 형태를 이해하도록 돕는 사고 구조화 학습 환경이다.
- 첫 화면은 시작 방식 카드와 짧은 템플릿을 쓰되, 카드는 결과 방향 강제 선택이 아니라 막막함을 줄이는 보조 장치다.
- `clarify_first`와 `approval_pending` 신호가 있어도 입문자 기본 화면은 pre-result 질문/승인 관문 없이 먼저 결과를 보여준다.
- 결과 화면은 renderer output 전에 `내가 이해한 요청`, `추천 작업 형태`, `왜 이 방향인지`, `빠진 정보`, `조심해야 할 추측`, `다음에 더 잘 요청하려면`을 짧게 보여준다.

## Settled
- `apps/product-web`가 현재 제품 프론트와 수동 검증의 기본 기준면이다.
- `apps/prompt-web`는 동결된 최소 fallback 검증 surface이며 새 기능을 넣지 않는다.
- prompt, plan, architecture, review-report 결과는 각각 학습 패널 또는 후속 action을 통해 "왜 이렇게 정리됐는지"를 설명해야 한다.
- Stage 1 agent는 post-result layer만 다룬다: review 수정, plan 구체화, architecture flow-detail 세부화.
- 후속 결과는 원본 결과를 덮어쓰지 않고 별도 블록으로 표시한다.
- plan 결과 이후 `AI 코딩툴에 넣을 내용`은 보조 handoff harness로 유지한다.
- plan handoff는 JSON 작업 카드와 `Codex 작업 지시` Markdown 복사 surface를 모두 제공한다.
- 코딩툴 handoff는 plan 결과를 읽은 뒤 쓰는 보조 next step이어야 하며, 제품의 메인 약속처럼 보이면 안 된다.

## Do Not Change Silently
- cards/templates를 mandatory gate로 되돌리지 않는다.
- pre-result 질문/승인 friction을 재도입하지 않는다.
- AI 코딩툴 handoff를 첫 화면, 주 목적, 또는 범용 코딩 프롬프트 생성기로 키우지 않는다.
- auth, persistence, history, 협업, 고급 모델 설정을 이 lane에 섞지 않는다.
- renderer-specific UX wording을 engine-core contract로 올리지 않는다.
- architecture follow-up을 API 명세, 구현 계획, 코드 생성으로 자동 전환하지 않는다.

## Verification Passed On Main
- `npm.cmd run typecheck`
- `npm.cmd run verify:prompt-cycle`
- `npm.cmd run verify:plan-renderer`
- `npm.cmd run verify:architecture-renderer`
- `npm.cmd run verify:review-renderer`
- `npm.cmd run verify:coding-tool-handoff`

## Cleaned Up
- Previous parallel worktrees under `C:\tmp\vive-studio-*` were removed.
- Merged local branches for renderer learning and handoff passes were deleted.
- Remaining local branch outside main: `codex/stage2-implementation-plan`.

## Best Next Step
Choose one focused lane before editing:
- Product-web manual pass: run `docs/product-web-manual-checklist.md` against the current UI and fix only visible beginner-flow regressions.
- Handoff UX pass: make the JSON and Codex copy surfaces easier to understand while keeping them secondary to the plan result.
- Stage 2 planning: read `docs/agent-stage1-design.md` first and keep Stage 1 post-result boundaries intact.
