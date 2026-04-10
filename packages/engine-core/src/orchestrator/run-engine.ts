import type {
  EngineRequest,
  EngineResult,
  Renderer,
  RendererId,
  ValidationReport,
} from "@vive-studio/engine-contracts";

import { analyzeRequest, type AnalyzeRequestOptions } from "./analyze-request.js";

export type RendererRegistry = Partial<Record<RendererId, Renderer>>;

export type RunEngineOptions = AnalyzeRequestOptions & {
  renderers: RendererRegistry;
  targets?: RendererId[];
  approval?: {
    recommended?: boolean;
    required?: boolean;
  };
};

function buildReadyValidationReport(): ValidationReport {
  return {
    status: "ready",
    issues: [],
    suggested_questions: [],
  };
}

function resolveTargets(
  request: EngineRequest,
  fallbackTargets: RendererId[],
  options?: Pick<RunEngineOptions, "targets">,
): RendererId[] {
  const targets = options?.targets ?? request.targets ?? fallbackTargets;

  if (targets.length === 0) {
    return fallbackTargets;
  }

  return targets;
}

function shouldRender(
  result: Pick<EngineResult, "next_step" | "approval_level">,
  approval: RunEngineOptions["approval"],
): boolean {
  if (result.next_step === "clarify_first") {
    return false;
  }

  if (result.next_step !== "approval_pending") {
    return true;
  }

  if (result.approval_level === "required") {
    return approval?.required === true;
  }

  if (result.approval_level === "recommended") {
    return approval?.recommended === true;
  }

  return true;
}

export async function runEngine(
  request: EngineRequest,
  options: RunEngineOptions,
): Promise<EngineResult> {
  const analyzed = analyzeRequest(request, options);
  const engineResult: EngineResult = {
    source: request.source,
    intent_ir: analyzed.intent_ir,
    analysis_validation: analyzed.analysis_validation,
    outputs: [],
    meta: analyzed.meta,
    mode_guess: analyzed.mode_guess,
    provisional_renderer: analyzed.provisional_renderer,
    missing_critical_facts: analyzed.missing_critical_facts,
    ambiguity_score: analyzed.ambiguity_score,
    structure_score: analyzed.structure_score,
    risk_score: analyzed.risk_score,
    next_step: analyzed.next_step,
    approval_level: analyzed.approval_level,
    pivot_recommended: analyzed.pivot_recommended,
    reason_codes: analyzed.reason_codes,
    ...(analyzed.pivot_reason
      ? { pivot_reason: analyzed.pivot_reason }
      : {}),
  };

  if (!shouldRender(engineResult, options.approval)) {
    return engineResult;
  }

  const targets = resolveTargets(request, analyzed.recommended_targets, options);

  for (const target of targets) {
    const renderer = options.renderers[target];

    if (!renderer) {
      throw new Error(`Renderer not registered for target: ${target}`);
    }

    const output = await renderer.render(analyzed.renderer_handoff);
    const validation = renderer.validateOutput
      ? await renderer.validateOutput(output, analyzed.renderer_handoff)
      : buildReadyValidationReport();

    engineResult.outputs.push({
      renderer: target,
      output,
      validation,
    });
  }

  return engineResult;
}
