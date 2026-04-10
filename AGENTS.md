# AGENTS.md

## Purpose
This file is the top-level startup and working guide for Vibe Studio.
Use it to know what to read first, which documents are source of truth, and how to work safely in a non-coder-operated project.

Do not turn this file into a large design document.
Keep detailed rules in focused docs.

## Light Orchestration Baseline
Vibe Studio currently uses light orchestration.

This means:
- assume one main agent per thread
- prefer one clear boundary at a time
- do not introduce complex multi-agent workflows by default
- do not rely on undocumented thread memory
- use focused docs as the shared operating system

Rule:
- do not add parallel or delegated agent workflows unless the user explicitly wants that style of operation

## Zero-Context Startup Rule
Assume no prior thread context is reliable until the current source-of-truth documents are read.

When starting a new session:
1. read the required documents in order
2. rebuild context from those documents
3. treat undocumented assumptions as unsafe
4. do not trust remembered context over current docs

If current docs conflict with remembered context, follow the docs and report the conflict.

## Required Read Order
Read these first for any product, routing, approval, renderer, or engine work:

1. `docs/product-intent.md`
2. `docs/workflow-charter.md`
3. `docs/glossary.md`
4. `docs/approval-gate.md`
5. `docs/golden-cases.md`
6. `docs/PRD.md`
7. `docs/success-criteria.md`
8. `docs/TRD.md`

Read these next when implementation, contracts, or package boundaries matter:

9. `docs/engine-structure.md`
10. `docs/minimum-contracts.md`
11. `docs/renderer-output-baseline.md`

Read this as an always-on operating rule:

12. `docs/noncoder-safety-rules.md`

## Document Precedence
Use this priority order when design documents overlap:

1. `docs/product-intent.md`
2. `docs/workflow-charter.md`
3. `docs/approval-gate.md`
4. `docs/golden-cases.md`
5. `docs/PRD.md`
6. `docs/success-criteria.md`
7. `docs/TRD.md`
8. `docs/engine-structure.md`
9. `docs/minimum-contracts.md`
10. `docs/renderer-output-baseline.md`

Rule:
- do not use a lower-priority document to silently override a higher-priority document
- if documents appear to conflict, stop and report the conflict before implementing

## Terminology Rule
`docs/glossary.md` is the terminology reference for the project.
Use it to resolve wording ambiguity across product, technical, and agent-facing docs.

Rule:
- `docs/glossary.md` does not override higher-priority product or technical decisions
- when a term is unclear, prefer the glossary definition over local guesswork

## Always-On Operating Rule
`docs/noncoder-safety-rules.md` is not a lower-priority design document.
It is an always-on operating constraint for agent behavior.

Follow it together with this file on every implementation thread.

## Product Priorities
- optimize for AI beginners, not advanced power users
- preserve the product as a structured-thinking learning environment, not a generic output generator
- keep the engine core renderer-neutral
- treat cards as optional guidance, not mandatory entry gates
- prefer explainable behavior over hidden automation
- never silently switch card-implied direction, mode, or renderer without user approval

## Core Behavioral Rules
- distinguish `create` intent from `review` intent as early as possible
- if the task is mainly evaluation of an existing artifact, route to `review` first
- use provisional renderer recommendation before final renderer lock
- if critical facts are missing, prefer `clarify_first` before renderer lock
- apply strong rule overrides before score-based approval interpretation
- treat `approval_pending + recommended` as a soft checkpoint with conscious user choice
- treat `approval_pending + required` as a block before final rendering
- use `docs/golden-cases.md` to protect routing, gating, clarification, and pivot behavior

## Implementation Rules
- do not put renderer-specific phrasing rules inside shared semantic contracts
- do not let app UX logic leak into engine-core contracts
- do not let renderer packages redefine approval policy
- keep `IntentIr` renderer-neutral
- keep detailed output formatting inside each renderer package
- prefer stable boundaries over extra abstraction that weakens ownership clarity

## Missing-Rule Handling
If a needed rule is missing:
1. classify whether the gap is product, policy, core, renderer, or contract related
2. check whether an existing source-of-truth doc already implies the answer
3. if the answer is still unclear and behavior would change, stop and ask or update the relevant doc before implementing
4. do not invent a silent policy change during implementation

## Documentation Update Rules
Update a focused document in the same thread if a change affects:
- target user definition
- product identity
- workflow boundary
- approval behavior
- golden-case behavior
- shared contracts
- renderer responsibility boundaries
- terminology that changes how other docs should be interpreted
- acceptance criteria used to decide whether MVP passes or fails

Do not update docs for:
- internal refactors with no behavior change
- naming cleanup that does not affect source-of-truth meaning
- implementation detail that does not change baseline behavior

## Handoff Rules
Leave a handoff only when the next session would otherwise lose important starting context.

A handoff is warranted when at least one of these changed:
- the current implementation boundary
- what is considered settled
- what remains open
- the best next step

Do not use handoff as a changelog dump.

## Escalation Rule
Pause and classify the change before implementing if it risks changing:
- target user definition
- product identity
- approval behavior
- routing behavior
- renderer boundaries
- shared contracts
- glossary meanings that would change how existing docs are read
- success criteria used to decide MVP acceptance

## Final Rule
If it is unclear whether logic belongs to app, policy, core, or renderer, stop and classify ownership first.

