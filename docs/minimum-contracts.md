# Minimum Contracts Draft

Updated: 2026-04-07
Language target: TypeScript
Rule: contracts must stay renderer-neutral

## source-input.ts
```ts
export type SourceInput = {
  text: string;
  locale?: string;
  metadata?: Record<string, unknown>;
};
```

## clarification-question.ts
```ts
export type ClarificationQuestion = {
  id: string;
  question: string;
  reason: string;
  improves: string;
  intent_key: string;
  priority: "high" | "medium" | "low";
};
```

## analysis-draft.ts
```ts
import type { ClarificationQuestion } from "./clarification-question";

export type AnalysisDraft = {
  summary: string;
  intent: {
    goal: string;
    audience: string;
    context: string;
    desired_output: string;
    tone: string;
  };
  constraints: string[];
  success_criteria: string[];
  risks: string[];
  assumptions: string[];
  missing_information: string[];
  candidate_questions: ClarificationQuestion[];
};
```

## intent-ir.ts
```ts
import type { ClarificationQuestion } from "./clarification-question";

export type IntentIr = {
  version: 1;
  source_text: string;
  summary: string;
  intent: {
    goal: string;
    audience: string;
    context: string;
    output_kind: string;
    tone: string;
  };
  output_contract: {
    constraints: string[];
    success_criteria: string[];
  };
  analysis: {
    risks: string[];
    assumptions: string[];
    missing_information: string[];
    clarification_questions: ClarificationQuestion[];
  };
  signals: {
    confidence: "low" | "medium" | "high";
    needs_clarification: boolean;
    ambiguity_level: "low" | "medium" | "high";
  };
};
```

## validation.ts
```ts
import type { ClarificationQuestion } from "./clarification-question";

export type ValidationIssue = {
  code: string;
  severity: "low" | "medium" | "high";
  message: string;
  path?: string;
  scope: "analysis" | "output";
};

export type ValidationReport = {
  status: "ready" | "review" | "blocked";
  issues: ValidationIssue[];
  suggested_questions: ClarificationQuestion[];
};
```

## renderer.ts
```ts
import type { SourceInput } from "./source-input";
import type { IntentIr } from "./intent-ir";
import type { ValidationReport } from "./validation";

export type RendererHandoff = {
  source: SourceInput;
  intent_ir: IntentIr;
  analysis_validation: ValidationReport;
  meta: {
    provider: string;
    model: string;
    parse_repair_used: boolean;
    semantic_repair_count: number;
    validation_retry_count: number;
  };
};

export interface Renderer<TOutput = unknown> {
  id: string;
  render(handoff: RendererHandoff): TOutput;
  validateOutput?(
    output: TOutput,
    handoff: RendererHandoff,
  ): ValidationReport;
}
```

## engine-request.ts
```ts
import type { SourceInput } from "./source-input";

export type EngineRequest = {
  source: SourceInput;
  targets: string[];
  runtime?: {
    provider?: string;
    model?: string;
  };
};
```

## engine-result.ts
```ts
import type { SourceInput } from "./source-input";
import type { IntentIr } from "./intent-ir";
import type { ValidationReport } from "./validation";

export type EngineResult = {
  source: SourceInput;
  intent_ir: IntentIr;
  analysis_validation: ValidationReport;
  outputs: Array<{
    renderer: string;
    output: unknown;
    validation: ValidationReport;
  }>;
  meta: {
    provider: string;
    model: string;
    parse_repair_used: boolean;
    semantic_repair_count: number;
    validation_retry_count: number;
  };
};
```

## Contract Rules
- `AnalysisDraft` may be generation-shaped, but not renderer-shaped.
- `IntentIr` may describe intent and constraints, but not prompt scaffolding.
- `RendererHandoff` is the only shared input a renderer should need.
- `EngineResult` supports multiple outputs from one run.
- Output validation must stay separate from analysis validation.
