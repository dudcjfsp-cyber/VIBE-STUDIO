import type { Renderer } from "@vive-studio/engine-contracts";

import type { SpecOutput } from "./spec-output.js";
import { renderSpec } from "./render-spec.js";
import { validateSpecOutput } from "./validate-spec-output.js";

export type { SpecOutput, SpecSection } from "./spec-output.js";
export { renderSpec } from "./render-spec.js";
export { validateSpecOutput } from "./validate-spec-output.js";

export const specRenderer: Renderer<SpecOutput> = {
  id: "spec",
  render: renderSpec,
  validateOutput: validateSpecOutput,
};
