import type {
  IntentIr,
  RendererHandoff,
  SourceInput,
  ValidationReport,
} from "@vive-studio/engine-contracts";

export function buildRendererHandoff(args: {
  source: SourceInput;
  intent_ir: IntentIr;
  analysis_validation: ValidationReport;
  meta: RendererHandoff["meta"];
}): RendererHandoff {
  return {
    source: args.source,
    intent_ir: args.intent_ir,
    analysis_validation: args.analysis_validation,
    meta: args.meta,
  };
}
