import type { Renderer } from "@vive-studio/engine-contracts";

import type { PlanOutput } from "./plan-output.js";
import { createPlanRenderer } from "./create-plan-renderer.js";
import { renderPlan } from "./render-plan.js";
import { validatePlanOutput } from "./validate-plan-output.js";

export type { PlanOutput, PlanSection } from "./plan-output.js";
export type {
  CreatePlanRendererOptions,
  StructuredObjectGenerationRequest,
  StructuredObjectGenerator,
} from "./create-plan-renderer.js";
export { createPlanRenderer } from "./create-plan-renderer.js";
export { renderPlan } from "./render-plan.js";
export { validatePlanOutput } from "./validate-plan-output.js";

export const planRenderer: Renderer<PlanOutput> = createPlanRenderer();
