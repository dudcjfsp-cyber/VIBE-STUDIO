# Vibe Studio Engine Seed

Updated: 2026-04-07
Purpose: independent engine seed for multiple renderers

## Direction
This workspace should start as an independent engine, not as an upgrade of the current repo.
The current repo is a reference source for extracted boundaries, not the new core.

## Recommended Monorepo Structure
```text
vibe-studio/
  apps/
    product-web/
    product-server/

  packages/
    engine-contracts/
      src/
        source-input.ts
        clarification-question.ts
        analysis-draft.ts
        intent-ir.ts
        validation.ts
        renderer.ts
        engine-request.ts
        engine-result.ts
        index.ts

    engine-core/
      src/
        runtime/
          model-runtime.ts
          provider-registry.ts
        execution/
          run-structured-generation.ts
          parse-repair.ts
          semantic-repair.ts
        analysis/
          normalize-analysis-draft.ts
          derive-intent-ir.ts
          build-clarification-questions.ts
        validation/
          validate-analysis-draft.ts
          validate-intent-ir.ts
          merge-validation-reports.ts
        handoff/
          build-renderer-handoff.ts
        orchestrator/
          create-engine.ts
          run-engine.ts
        index.ts

    renderer-prompt/
      src/
        render-prompt.ts
        validate-prompt-output.ts
        index.ts

    renderer-plan/
      src/
        render-plan.ts
        validate-plan-output.ts
        index.ts

    renderer-architecture/
      src/
        render-architecture.ts
        validate-architecture-output.ts
        index.ts
```

## Dependency Rules
- `engine-contracts` is the shared center.
- `engine-core` depends only on `engine-contracts`.
- `renderer-*` packages depend only on `engine-contracts`.
- `engine-core` must not import a concrete renderer directly.
- apps compose `engine-core` with renderer packages.
- apps are optional composition surfaces and should not define renderer completion.

## Why This Shape
- It keeps the core renderer-neutral.
- It allows prompt, plan, architecture, and future review outputs to share one engine.
- It avoids carrying plan-shaped compatibility into the new project.

## Core Principles
- No `plan` or `prompt` naming inside shared engine contracts.
- Intent IR must stay renderer-neutral.
- Renderer wording and output scaffolding belong only inside renderer packages.
- UI state must not leak into engine contracts.
- Validation should be split into analysis validation and renderer-output validation.

## Boundary Classification
### Carry over directly
- provider and model runtime abstraction
- structured generation loop
- parse repair and semantic repair loop
- explicit renderer handoff concept
- clarification question metadata concept

### Rebuild with the same idea, but not the same code
- intent IR contract
- renderer plugin shape
- validation layer split
- orchestrator and facade boundaries

### Do not carry over
- `standard_output` as the engine center
- `SPEC_INTENT_FIELD_MAP`
- plan-shaped pipeline naming such as `runPlanTransmutePipeline`
- bridges that rebuild prompt output from plan results
- prompt-native rewrite logic inside intent derivation
- domain-specific lexical exception bundles in the core
- UI shadow state or compatibility-only app state

## First Build Order
1. `engine-contracts`
2. `engine-core`
3. `renderer-prompt`
4. `renderer-plan`
5. `renderer-architecture`
6. `review-report` renderer
7. `product-web` / `product-server` composition for product UX and manual verification
