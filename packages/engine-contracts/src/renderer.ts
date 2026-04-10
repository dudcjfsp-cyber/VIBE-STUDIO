import type { IntentIr } from "./intent-ir.js";
import type { SourceInput } from "./source-input.js";
import type { ValidationReport } from "./validation.js";
import type { RendererId } from "./workflow-signals.js";

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
  id: RendererId;
  render(handoff: RendererHandoff): TOutput | Promise<TOutput>;
  validateOutput?(
    output: TOutput,
    handoff: RendererHandoff,
  ): ValidationReport | Promise<ValidationReport>;
}
