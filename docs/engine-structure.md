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
    prompt-web/
    spec-web/
    architecture-web/

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

    renderer-spec/
      src/
        render-spec.ts
        validate-spec-output.ts
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
- It allows prompt, spec, architecture, and future review outputs to share one engine.
- It avoids carrying spec-shaped compatibility into the new project.

## Core Principles
- No `spec` or `prompt` naming inside shared engine contracts.
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
- spec-shaped pipeline naming such as `runSpecTransmutePipeline`
- bridges that rebuild prompt output from spec results
- prompt-native rewrite logic inside intent derivation
- domain-specific lexical exception bundles in the core
- UI shadow state or compatibility-only app state

## First Build Order
1. `engine-contracts`
2. `engine-core`
3. `renderer-prompt`
4. `renderer-spec`
5. `renderer-architecture`
6. `review-report` renderer
7. optional lightweight app composition only if manual verification needs it
