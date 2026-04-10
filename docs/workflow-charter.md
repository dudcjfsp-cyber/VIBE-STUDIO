# Vibe Studio Workflow Charter

Updated: 2026-04-08
Purpose: separate product workflow from engine design

## Goal
Vibe Studio is a structured-thinking platform.
It turns vague natural-language input into outputs such as prompt, spec, architecture, and review reports.

Rule:
- the product may guide, interrupt, and coach
- the engine core must remain renderer-neutral

## Fixed Terms
- Track: user-facing entry choice in the app
- Mode: session posture such as `create` or `review`
- Renderer: output family such as `prompt`, `spec`, `architecture`, `review-report`
- Workflow Policy: rules for approval, pivot suggestion, warning escalation, and force-run
- Engine Core: renderer-neutral analysis, validation, and handoff system

Rule:
- tracks belong to the app
- modes belong to orchestration and policy
- renderers belong to output packages
- engine core must not own UI wording

## Layer Rules
### App Experience
Responsibilities:
- show entry cards
- collect input
- show approval dialogs
- show warnings and coaching feedback

### Workflow Policy
Responsibilities:
- require or skip approval
- suggest pivots
- decide warning escalation
- allow or block force-run

### Engine Core
Responsibilities:
- analyze input
- derive intent IR
- estimate ambiguity and complexity
- generate clarification questions
- validate analysis
- build one shared renderer handoff
- run requested renderers

### Renderer Layer
Responsibilities:
- turn one shared handoff into one output format
- validate renderer-specific output

## Track Mapping
- Track A: Idea Structuring -> `mode=create`, primary renderer=`spec`
- Track B: Command Optimization -> `mode=create`, primary renderer=`prompt`
- Track C: System Architecture -> `mode=create`, primary renderer=`architecture`
- Track D: Critical Review -> `mode=review`, primary renderer=`review-report`

Rule:
- Track D is review mode, not a peer generation track in the engine contract

## Entry and Renderer Selection
- The default first step is free input, not mandatory track selection.
- Entry cards may remain visible, but only as optional guidance.
- The system should first distinguish between `create` intent and `review` intent.
- The system may recommend a provisional renderer based on the input and selected card.
- The system must not silently lock or switch renderers without user approval.
- If key information is missing, clarification should happen before renderer selection is finalized.
- Renderer choice is based on user intent, system recommendation, and rendering readiness.

## Approval and Pivot Rules
- The engine must support both direct-render and approval-first workflows.
- Clarification may take precedence over approval when critical facts are missing.
- Pivoting may be suggested, but never silently auto-switched.
- Friction and coaching belong to app or policy, not engine core.
- Detailed gating logic and the minimal scoring model live in `docs/approval-gate.md`.

## Engine Flow
1. Analyze source input.
2. Return mode guess, provisional renderer, validation, questions, and target recommendation.
3. Let the app collect clarification, approval, revision, or more information.
4. Render one or more requested targets.
5. Return per-renderer validation.

Rule:
- the app owns waiting for user approval
- the engine exposes results and stages, not UI states

## Carry / Rebuild / Discard
### Carry directly
- provider and model runtime abstraction
- structured generation loop
- parse repair and semantic repair loop
- explicit renderer handoff concept
- clarification question metadata concept

### Rebuild with the same idea
- intent IR contract
- renderer plugin shape
- validation layer split
- orchestrator boundaries

### Do not carry
- `standard_output` as the engine center
- `SPEC_INTENT_FIELD_MAP`
- spec-shaped pipeline naming
- spec-to-prompt bridge logic
- prompt-native rewrite rules inside intent derivation
- UI shadow state and compatibility-only app state
- domain-specific lexical exception bundles in the core

## First Build Order
1. `engine-contracts`
2. `engine-core`
3. `renderer-prompt`
4. `renderer-spec`
5. `renderer-architecture`
6. `review-report` renderer
7. optional lightweight app integration if a manual verification surface is needed

## Final Boundary Rule
If it changes UI wording or friction, it belongs to app or policy.
If it changes semantic interpretation, it belongs to engine core.
If it changes final output format, it belongs to a renderer.

