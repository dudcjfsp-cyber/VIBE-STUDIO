import type { Renderer } from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";
import { createPromptRenderer } from "./create-prompt-renderer.js";
import { renderPrompt } from "./render-prompt.js";
import { validatePromptOutput } from "./validate-prompt-output.js";

export type { PromptOutput } from "./prompt-output.js";
export type {
  CreatePromptRendererOptions,
  StructuredObjectGenerationRequest,
  StructuredObjectGenerator,
} from "./create-prompt-renderer.js";
export { createPromptRenderer } from "./create-prompt-renderer.js";
export { renderPrompt } from "./render-prompt.js";
export { validatePromptOutput } from "./validate-prompt-output.js";

export const promptRenderer: Renderer<PromptOutput> = createPromptRenderer();
