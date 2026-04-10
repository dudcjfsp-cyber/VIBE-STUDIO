import type { Renderer } from "@vive-studio/engine-contracts";

import type { ArchitectureOutput } from "./architecture-output.js";
import { renderArchitecture } from "./render-architecture.js";
import { validateArchitectureOutput } from "./validate-architecture-output.js";

export type {
  ArchitectureComponent,
  ArchitectureFlow,
  ArchitectureOutput,
} from "./architecture-output.js";
export { renderArchitecture } from "./render-architecture.js";
export { validateArchitectureOutput } from "./validate-architecture-output.js";

export const architectureRenderer: Renderer<ArchitectureOutput> = {
  id: "architecture",
  render: renderArchitecture,
  validateOutput: validateArchitectureOutput,
};
