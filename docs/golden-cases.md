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
- learning expectation
- short reason

Rule:
- golden case는 workflow baseline을 고정한다
- renderer-specific output wording, finding density, section phrasing은 다른 문서와 renderer verify가 소유한다
- learning expectation은 자동 workflow 판정 필드가 아니라, product-web 수동 점검에서 사용자가 무엇을 이해해야 하는지 확인하는 기준이다

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
- Learning expectation: 사용자는 이 요청이 이미 실행형 프롬프트로 만들 만큼 목표가 분명하다는 점을 이해해야 한다.
- Reason: goal, output shape, and renderer fit are already clear enough for direct rendering.

### Case 2: Beginner Idea Structuring
- Input: `이 아이디어를 서비스 기획처럼 정리해줘. 혼자 사는 사람들이 남는 반찬을 이웃끼리 나누는 앱이야.`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `plan`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `1`
- Expected `structure_score`: `1`
- Expected `risk_score`: `1`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `recommended`
- Expected `pivot_recommended`: `false`
- Learning expectation: 사용자는 막연한 앱 아이디어가 바로 문구 생성보다 문제, 대상, 범위 정리로 먼저 좋아진다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 기능 목록보다 시스템 경계와 설계 초점이 먼저 필요하다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 기존 프롬프트를 새로 써달라는 요청과 먼저 약점을 보는 검토 요청이 다르다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 검토하려면 실제 초안이 필요하고, 초안이 없으면 판단 기준보다 검토 대상이 먼저 비어 있다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 선택한 카드보다 실제 요청의 작업 성격이 우선이며, 전환은 조용히 일어나지 않고 설명되어야 한다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 외부 고객에게 나가는 결과는 내용이 명확해도 한 번 더 확인하는 편이 안전하다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 프롬프트 카드로 들어왔더라도 실제로는 시스템 구조를 먼저 나누는 일이 필요할 수 있다는 점을 이해해야 한다.
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
- Learning expectation: 사용자는 경계와 흐름 초점이 채워지면 architecture가 질문 대기에서 명시적 확인 후 구조화로 이동한다는 점을 이해해야 한다.
- Reason: once the system boundary and design focus are present, architecture should move from clarify-first to explicit approval rather than stay blocked.

### Case 10: Lightweight MVP Plan Free Input
- Input: `동네 커피 모임 앱 mvp 기획 정리해줘`
- Selected card: none
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `plan`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `1`
- Expected `structure_score`: `1`
- Expected `risk_score`: `1`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `recommended`
- Expected `pivot_recommended`: `false`
- Learning expectation: 사용자는 가벼운 MVP 아이디어도 먼저 결과를 보며 문제, 대상, 범위를 보완할 수 있다는 점을 이해해야 한다.
- Reason: a concrete app subject plus MVP planning scope is enough for a soft checkpoint; it should not fall into clarify-first or feel like a template-gated path.

### Case 11: Plan Card With Prompt Product Subject
- Input: `나는 AI 입문자를 위한 프롬프트 연습 노트를 만들고 싶어요. 주요 대상은 AI를 처음 써보는 비개발자입니다. 이 아이디어를 기획 정리로 잡아줘.`
- Selected card: `아이디어 정리`
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `plan`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `1`
- Expected `risk_score`: `1`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `recommended`
- Expected `pivot_recommended`: `false`
- Expected `intent.audience_contains`: `AI를 처음 써보는 비개발자`
- Learning expectation: 사용자는 입력 안의 `프롬프트`라는 단어가 항상 prompt renderer를 뜻하지 않고, 제품 주제일 수 있다는 점을 이해해야 한다.
- Reason: the word prompt is part of the product subject, while the selected card and requested work are product planning.

### Case 12: Free Input Title Generation
- Input: `AI 입문자를 대상으로 한 5분짜리 유튜브 영상 제목을 10개 뽑고 싶어. 너무 과장된 제목은 피하고 싶어.`
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
- Learning expectation: 사용자는 제목 후보 생성처럼 바로 실행 가능한 요청은 plan으로 과하게 구조화하지 않아도 된다는 점을 이해해야 한다.
- Reason: free input asking for title candidates is an executable generation request, not product planning.

### Case 13: Plan Audience Hint Overrides Earlier Audience
- Input: `AI 입문자를 위한 프롬프트 연습 노트를 만들고 싶어. 주요 대상은 AI를 처음 써보는 비개발자야. 이 아이디어를 기획 정리로 잡아줘. 가장 먼저 쓸 사람은 혼자 시작하는 초보 사용자라고 보고 기획을 잡아줘.`
- Selected card: `아이디어 정리`
- Expected `mode_guess`: `create`
- Expected `provisional_renderer`: `plan`
- Expected `missing_critical_facts`: `false`
- Expected `ambiguity_score`: `0`
- Expected `structure_score`: `1`
- Expected `risk_score`: `1`
- Expected `next_step`: `approval_pending`
- Expected `approval_level`: `recommended`
- Expected `pivot_recommended`: `false`
- Expected `intent.audience_contains`: `혼자 시작하는 초보 사용자`
- Expected `force_render.plan_section_absent`: `맥락`
- Learning expectation: 사용자는 뒤에 덧붙인 더 구체적인 대상 설명이 결과의 중심 사용자를 갱신한다는 점을 이해해야 한다.
- Reason: when an input hint is appended later, the latest explicit audience statement should update the plan audience instead of keeping the earlier placeholder or earlier audience.

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
- what lightweight free-input MVP planning looks like without unnecessary clarification
- what plan-card routing looks like when the product subject itself contains the word prompt
- what free input title-generation requests look like without a selected prompt card

## Expansion Rule
Add a new golden case only when it locks a new boundary that is not already covered by an existing case.
Do not add cases that only restate the same behavior with different wording.
