# Approval Gate

Updated: 2026-04-09
Purpose: decide whether the next step is direct rendering, clarification first, or explicit approval before rendering.

## Core Principle
Approval gating judges readiness for rendering, not abstract complexity alone.

The gate chooses the next step.
It does not replace intent analysis, provisional renderer recommendation, or UI policy wording.

## Settled Rules
- The system should first distinguish between `create` intent and `review` intent.
- The system may recommend a provisional renderer before the final renderer is locked.
- If critical facts are missing for the provisional renderer, clarification comes before renderer lock.
- The system must not silently switch renderer, mode, or card-implied direction.
- Pivot recommendation is guidance and still requires user approval.
- The gate uses rule overrides first and scoring second.
- The gate must not rely on a single hidden total score as the only decision logic.
- The MVP should use one stable approval behavior for all users.
- User-level adaptation is a future workflow-policy extension, not part of the initial baseline.

## Gate Outputs
The gate should return three kinds of outputs.

### 1. Next Step
- `direct_render`
- `clarify_first`
- `approval_pending`

### 2. Approval Level
- `none`
- `recommended`
- `required`

### 3. Overlay Signals
- `pivot_recommended`
- `pivot_reason`
- `reason_codes`

Rule:
- `pivot_recommended` may appear together with any next step
- `approval_pending` may be either `recommended` or `required`
- `clarify_first` takes precedence over approval when critical facts are missing

## MVP Baseline
For the MVP, `approval_pending + recommended` should behave as a soft checkpoint.
It should not be a hard stop, but it should require a conscious user choice.

Recommended user choices:
- `confirm and continue`
- `continue anyway`

Rule:
- do not reduce `recommended` to a passive banner only
- do not make `recommended` indistinguishable from `required`

## Strong Rule Overrides
These rules run before score-based interpretation.

1. If the request is primarily a review request, route it to `review` mode before normal creation scoring.
2. If critical facts are missing, set `next_step = clarify_first`.
3. If the selected card hint and the recommended renderer strongly disagree, set `pivot_recommended = true`.
4. If renderer choice depends on missing facts, do not lock the renderer yet.

## Review-First Rule
Treat a request as `review` intent first when the primary task is evaluation of an existing artifact.

Typical review-first signals:
- asking to find problems, flaws, contradictions, or weak points
- asking for critique, diagnosis, validation, or assessment
- asking to inspect an existing draft, prompt, document, plan, structure, or system
- asking whether something is good, wrong, inconsistent, risky, or logically sound

Do not treat a request as `review` only because it is detailed or cautious.
If the primary task is still creation, keep it in `create` mode.

Rule:
- if the task is mainly about judging an existing artifact, route to `review` before normal creation scoring
- if the artifact under review is missing, keep `review` mode and return `clarify_first`

## Critical Facts Rule
A missing item is a critical fact when the system cannot produce a responsible result for the provisional renderer without it.

A critical fact is not just “nice to have.”
It is information whose absence would make the current output shallow, misleading, or risky.

Typical critical facts by renderer:
- `prompt`: core goal, target task, decision-changing context
- `spec`: problem being solved, target user, scope or goal
- `architecture`: system boundary, major components, design focus
- `review-report`: artifact under review, review lens, evaluation criteria when needed

Rule:
- if a missing fact blocks responsible output for the provisional renderer, treat it as critical and return `clarify_first`
- if a missing fact only affects polish or quality tuning, do not treat it as critical by default

## Minimal Scoring Model (Draft)
Use three axis scores.
Do not use one combined total as the only rule.

- `ambiguity_score`: 0 to 2
- `structure_score`: 0 to 2
- `risk_score`: 0 to 2

Score meanings:
- `0` = low
- `1` = medium
- `2` = high

## Score Definitions
| Axis | 0 | 1 | 2 |
|---|---|---|---|
| Ambiguity | purpose and output are clear | one important detail is missing | one intent path cannot be locked without a meaningful guess |
| Structure | single simple output | multi-part output or moderate constraints | system-level, relationship-heavy, or multi-step design request |
| Risk | low cost if wrong | medium cost if wrong | external-facing, decision-heavy, or high-impact output |

## Ambiguity Score 2 Rule
Assign `ambiguity_score = 2` when at least one of the following is true:
- the goal is unclear
- the audience is missing and directly changes the output
- the output format is unclear
- two or more plausible interpretations would lead to different modes or different renderers

Do not assign `ambiguity_score = 2` only because:
- tone is missing
- an example is missing
- optional constraints are missing
- some details are still open even though the main direction is clear

Rule:
- `ambiguity_score = 2` means the system cannot safely lock one intent path without making a meaningful guess

## Structure Score 2 Rule
Assign `structure_score = 2` when the request is strongly one of the following:
- system-level design
- relationship-heavy design across multiple components
- multi-step flow or dependency design
- structural planning where the main task is to define a framework, not produce one simple artifact

Do not assign `structure_score = 2` based only on:
- length
- verbosity
- multiple bullet points by themselves
- one keyword such as `system` or `architecture`

Rule:
- `structure_score = 2` is about the shape of the request, not the size of the text alone

## Strong Renderer Mismatch Rule
A strong renderer mismatch exists when the renderer implied by the selected card hint and the inferred renderer imply different work posture, not just different detail level.

Typical strong mismatches:
- selected card hint implies `prompt`, inferred renderer is `architecture`
- selected card hint implies `create`, inferred mode is `review`
- selected card hint implies `prompt`, inferred renderer is `spec`

Do not treat these as strong mismatch by default:
- same renderer family with different tone or density
- same renderer family with different detail level
- small scope adjustment inside the same work posture

Rule:
- if the mismatch changes the nature of the task, not just its detail level, set `pivot_recommended = true`

## Decision Order
1. Determine whether the request is `create` or `review`.
2. Recommend a provisional renderer from the input and optional card hint.
3. Check whether critical facts are missing for that provisional renderer.
4. If critical facts are missing, return `clarify_first`.
5. If critical facts are present, interpret ambiguity, structure, and risk scores.
6. Return `direct_render` or `approval_pending`.
7. Add `pivot_recommended` if the selected card hint and recommended renderer strongly disagree.

## Score Interpretation Rules
- If `risk_score = 2`, set `approval_level = required` at minimum.
- If `ambiguity_score = 2` and critical facts are still missing, return `clarify_first`.
- If `ambiguity_score = 2` and critical facts are present, set `approval_pending` with `approval_level = required`.
- If `structure_score = 2` by itself, prefer `approval_pending` before rendering, not automatic blocking.
- If `structure_score = 2` is combined with missing critical facts, return `clarify_first`.
- If `structure_score = 2` is combined with `risk_score = 2`, prefer `approval_pending` with `approval_level = required`.
- If two or more scores are `1` or higher, prefer `approval_pending`.
- If all scores are `0`, `direct_render` may be allowed.

## Interpretation Notes
- A short request may still require `clarify_first` if key facts are missing.
- A complex request may still avoid blocking if the intent, scope, and constraints are already clear.
- High structure alone does not always mean the request must be blocked.
- High risk should be treated more strictly than high structure.

## Pivot Rules
Pivot recommendation belongs to workflow policy, but may be triggered by engine signals.

Typical pivot cases:
- the selected card hint implies `prompt`, but the input is really a system-design task
- the selected card hint implies `create`, but the input is really a review request
- the selected card hint implies one renderer while the input strongly fits another

Rule:
- pivot recommendation is guidance, not silent automation

## Engine Output Signals
The engine core may return:
- `mode_guess`
- `provisional_renderer`
- `ambiguity_score`
- `structure_score`
- `risk_score`
- `missing_critical_facts`
- `next_step`
- `approval_level`
- `pivot_recommended`
- `pivot_reason`
- `reason_codes`

Rule:
- the engine returns signals
- the app and workflow policy decide how those signals are shown to the user

## Anti-Rules
- Do not treat all complex requests as automatically blocked.
- Do not treat all simple requests as safe for direct rendering.
- Do not auto-switch renderer, mode, or card-implied direction without user approval.
- Do not use approval gating as a hidden punishment or vanity score.
- Do not let one total score override strong rule checks.
