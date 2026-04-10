import type { EngineRequest, RendererHandoff } from "@vive-studio/engine-contracts";

import { buildAnalysisDraft } from "../analysis/build-analysis-draft.js";
import { buildClarificationQuestions } from "../analysis/build-clarification-questions.js";
import { buildGateSignals } from "../analysis/build-gate-signals.js";
import { deriveIntentIr } from "../analysis/derive-intent-ir.js";
import { detectCriticalFacts } from "../analysis/detect-critical-facts.js";
import { detectMode } from "../analysis/detect-mode.js";
import { recommendRenderer } from "../analysis/recommend-renderer.js";
import { scoreRequest } from "../analysis/score-request.js";
import { buildRendererHandoff } from "../handoff/build-renderer-handoff.js";
import { mergeValidationReports } from "../validation/merge-validation-reports.js";
import { validateAnalysisDraft } from "../validation/validate-analysis-draft.js";
import { validateIntentIr } from "../validation/validate-intent-ir.js";
import type { AnalyzeResult } from "./analyze-result.js";

export type AnalyzeRequestOptions = {
  default_provider?: string;
  default_model?: string;
};

function buildMeta(
  request: EngineRequest,
  options: AnalyzeRequestOptions,
): RendererHandoff["meta"] {
  return {
    provider: request.runtime?.provider ?? options.default_provider ?? "unset",
    model: request.runtime?.model ?? options.default_model ?? "unset",
    parse_repair_used: false,
    semantic_repair_count: 0,
    validation_retry_count: 0,
  };
}

export function analyzeRequest(
  request: EngineRequest,
  options: AnalyzeRequestOptions = {},
): AnalyzeResult {
  const modeDetection = detectMode(request);
  const provisionalRenderer = recommendRenderer(request, modeDetection.mode);
  const criticalFacts = detectCriticalFacts(
    request,
    modeDetection.mode,
    provisionalRenderer,
  );
  const scores = scoreRequest(
    request,
    modeDetection.mode,
    provisionalRenderer,
    criticalFacts.missing_critical_facts,
  );
  const gateSignalInput = {
    mode_guess: modeDetection.mode,
    provisional_renderer: provisionalRenderer,
    missing_critical_facts: criticalFacts.missing_critical_facts,
    ambiguity_score: scores.ambiguity_score,
    structure_score: scores.structure_score,
    risk_score: scores.risk_score,
    ...(request.card_hint ? { card_hint: request.card_hint } : {}),
  };
  const gateSignals = buildGateSignals(gateSignalInput);
  const clarificationQuestions = buildClarificationQuestions(
    criticalFacts.missing_items,
    provisionalRenderer,
  );
  const analysisDraft = buildAnalysisDraft({
    request,
    gateSignals,
    clarificationQuestions,
    missingItems: criticalFacts.missing_items,
  });
  const intentIr = deriveIntentIr({
    source: request.source,
    draft: analysisDraft,
    gateSignals,
  });
  const analysisValidation = mergeValidationReports([
    validateAnalysisDraft(analysisDraft),
    validateIntentIr(intentIr),
  ]);
  const meta = buildMeta(request, options);
  const rendererHandoff = buildRendererHandoff({
    source: request.source,
    intent_ir: intentIr,
    analysis_validation: analysisValidation,
    meta,
  });

  return {
    ...gateSignals,
    request,
    analysis_draft: analysisDraft,
    intent_ir: intentIr,
    analysis_validation: analysisValidation,
    renderer_handoff: rendererHandoff,
    recommended_targets: [provisionalRenderer],
    meta,
  };
}
