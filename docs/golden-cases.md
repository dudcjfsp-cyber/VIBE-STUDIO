# Golden Cases

Updated: 2026-04-10
Purpose: lock expected engine and workflow behavior against representative beginner-user inputs.

## How To Use This Document
- Treat these cases as behavioral baselines, not implementation hints.
- Use them to check whether routing, approval gating, clarification, and pivot behavior still match the product definition.
- If an important behavior changes, update the relevant case or add a new one.
- Prefer beginner-style language in golden cases unless the case is explicitly marked as a regression case.
- Keep the case bullet format stable so automated verification can read this document directly.

## Case Format
Each case defines:
- input
- selected card
- expected `mode_guess`
- expected `provisional_renderer`
- expected `missing_critical_facts`
- expected `ambiguity_score`
- expected `structure_score`
- expected `risk_score`
- expected `next_step`
- expected `approval_level`
- expected `pivot_recommended`
- short reason

Rule:
- golden case는 workflow baseline을 고정한다
- renderer-specific output wording, finding density, section phrasing은 다른 문서와 renderer verify가 소유한다

## Product Core Cases
These cases represent the default target user: an AI beginner who is unsure what to ask for, what to call the output, or which card to choose.

### Case 1: Simple Prompt Request
- Input: `회의 전에 내가 뭘 물어봐야 할지 정리해주는 프롬프트 만들어줘`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `prompt`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `0`
- Expected `risk_score`: `0`
- Expected `next_step`: `direct_render`
- Expected `approval_level`: `none`
- Expected `pivot_recommended`: `false`
- Reason: goal, output shape, and renderer fit are already clear enough for direct rendering.

### Case 2: Beginner Idea Structuring
- Input: `이 아이디어를 서비스 기획처럼 정리해줘. 혼자 사는 사람들이 남는 반찬을 이웃끼리 나누는 앱이야.`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `spec`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `1`
- Expected `structure_score`: `1`
- Expected `risk_score`: `1`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `recommended`
- Expected `pivot_recommended`: `false`
- Reason: the direction is clear enough to proceed, but a soft checkpoint helps sharpen scope and problem framing.

### Case 3: Beginner Architecture Request
- Input: `내가 만들고 싶은 앱이 있는데 사용자용 화면, 가게용 화면, 결제, 알림이 다 들어가. 전체 구조를 먼저 잡아줘.`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `architecture`
- Expected `missing_critical_facts`: `true`
- Expected `ambiguity_score`: `1`
- Expected `structure_score`: `2`
- Expected `risk_score`: `2`
- Expected `next_step`: `clarify_first`
- Expected `approval_level`: `none`
- Expected `pivot_recommended`: `false`
- Reason: architecture intent is clear, but system boundary and design focus are still missing.

### Case 4: Prompt Review With Artifact Present
- Input: `내가 써본 프롬프트가 이상한지 봐줘: "친절하게 소개글 써줘"`
- Selected card: none
- Expected `mode_guess`: `review`
- Expected `provisional_renderer`: `review-report`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `0`
- Expected `risk_score`: `0`
- Expected `next_step`: `direct_render`
- Expected `approval_level`: `none`
- Expected `pivot_recommended`: `false`
- Reason: this is clearly evaluation of an existing artifact, and the artifact is available.

### Case 5: Review Request Without Artifact
- Input: `내가 적은 기획안이 말이 되는지 봐줘`
- Selected card: none
- Expected `mode_guess`: `review`
- Expected `provisional_renderer`: `review-report`
- Expected `missing_critical_facts`: `true`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `1`
- Expected `risk_score`: `1`
- Expected `next_step`: `clarify_first`
- Expected `approval_level`: `none`
- Expected `pivot_recommended`: `false`
- Reason: review intent is clear, but the artifact under review is missing.

### Case 6: Wrong Card, Actually Review
- Input: `내가 적어본 앱 소개문인데 뭐가 빠졌는지 먼저 봐줘: 바쁜 직장인들이 운동 기록을 쉽게 남기게 도와주는 앱`
- Selected card: `프롬프트 만들기`
- Expected `mode_guess`: `review`
- Expected `provisional_renderer`: `review-report`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `0`
- Expected `risk_score`: `1`
- Expected `next_step`: `direct_render`
- Expected `approval_level`: `none`
- Expected `pivot_recommended`: `true`
- Reason: the user entered through a creation-oriented card, but the actual task is evaluation of an existing draft.

## Gate Regression Cases
These cases are still written in beginner-friendly language, but they mainly protect important routing and safety boundaries.

### Case 7: High-Risk Public Communication
- Input: `결제가 두 번 된 고객들에게 보내는 사과 공지문이 필요해. 오늘 오전 10시부터 11시 사이 결제한 일부 고객이 대상이고, 중복 결제는 전액 환불된다고 써줘.`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `prompt`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `0`
- Expected `risk_score`: `2`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `required`
- Expected `pivot_recommended`: `false`
- Reason: the request is clear, but the output is public-facing and high impact.

### Case 8: Wrong Card, Actually Architecture
- Input: `뭘 먼저 만들어야 할지 모르겠어. 사용자용 앱, 관리자 페이지, 결제, 알림이 다 필요한 서비스인데 전체 뼈대부터 잡아줘.`
- Selected card: `프롬프트 만들기`
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `architecture`
- Expected `missing_critical_facts`: `true`
- Expected `ambiguity_score`: `1`
- Expected `structure_score`: `2`
- Expected `risk_score`: `2`
- Expected `next_step`: `clarify_first`
- Expected `approval_level`: `none`
- Expected `pivot_recommended`: `true`
- Reason: the user chose a prompt-oriented entry path, but the actual task is system-level structure planning.

### Case 9: Architecture Follow-Up After Scope Lock
- Input: `주문 관리 앱 전체 구조를 잡아줘. 범위는 사용자 앱, 점주 앱, 관리자 페이지, 결제 서비스, 알림 서비스고 주문 생성, 결제 승인, 주문 상태 알림 흐름에 집중해줘.`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `architecture`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `1`
- Expected `structure_score`: `2`
- Expected `risk_score`: `2`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `required`
- Expected `pivot_recommended`: `false`
- Reason: once the system boundary and design focus are present, architecture should move from clarify-first to explicit approval rather than stay blocked.

## Coverage Notes
This first set should lock these boundaries:
- what `direct_render` looks like
- what `clarify_first` looks like
- what `approval_pending + recommended` looks like
- what `approval_pending + required` looks like
- what `review-first` looks like
- what `strong renderer mismatch` looks like
- what `structure_score = 2` looks like for beginner requests
- what architecture follow-up looks like after critical facts are supplied

## Expansion Rule
Add a new golden case only when it locks a new boundary that is not already covered by an existing case.
Do not add cases that only restate the same behavior with different wording.
