import type {
  AnalysisDraft,
  EngineRequest,
  GateSignals,
  RendererHandoff,
  RendererId,
  ValidationReport,
  IntentIr,
} from "@vive-studio/engine-contracts";

export type AnalyzeResult = GateSignals & {
  request: EngineRequest;
  analysis_draft: AnalysisDraft;
  intent_ir: IntentIr;
  analysis_validation: ValidationReport;
  renderer_handoff: RendererHandoff;
  recommended_targets: RendererId[];
  meta: RendererHandoff["meta"];
};
