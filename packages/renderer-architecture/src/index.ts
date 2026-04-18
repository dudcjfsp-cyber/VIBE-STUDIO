import type { Renderer } from "@vive-studio/engine-contracts";

import type { ArchitectureOutput } from "./architecture-output.js";
import { createArchitectureRenderer } from "./create-architecture-renderer.js";
import { renderArchitecture } from "./render-architecture.js";
import { validateArchitectureOutput } from "./validate-architecture-output.js";

export type {
  ArchitectureComponent,
  ArchitectureFlow,
  ArchitectureOutput,
} from "./architecture-output.js";
export type {
  CreateArchitectureRendererOptions,
  StructuredObjectGenerationRequest,
  StructuredObjectGenerator,
} from "./create-architecture-renderer.js";
export { createArchitectureRenderer } from "./create-architecture-renderer.js";
export { renderArchitecture } from "./render-architecture.js";
export { validateArchitectureOutput } from "./validate-architecture-output.js";

export const architectureRenderer: Renderer<ArchitectureOutput> =
  createArchitectureRenderer();
