import type { IntentIr } from "./intent-ir.js";
import type { SourceInput } from "./source-input.js";
import type { ValidationReport } from "./validation.js";
import type { GateSignals, RendererId } from "./workflow-signals.js";

export type EngineResult = GateSignals & {
  source: SourceInput;
  intent_ir: IntentIr;
  analysis_validation: ValidationReport;
  outputs: Array<{
    renderer: RendererId;
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
