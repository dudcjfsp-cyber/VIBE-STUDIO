import type { Renderer } from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";
import { renderPrompt } from "./render-prompt.js";
import { validatePromptOutput } from "./validate-prompt-output.js";

export type { PromptOutput } from "./prompt-output.js";
export { renderPrompt } from "./render-prompt.js";
export { validatePromptOutput } from "./validate-prompt-output.js";

export const promptRenderer: Renderer<PromptOutput> = {
  id: "prompt",
  render: renderPrompt,
  validateOutput: validatePromptOutput,
};
