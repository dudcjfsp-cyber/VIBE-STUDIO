import type { SourceInput } from "./source-input.js";
import type { CardHint, RendererId } from "./workflow-signals.js";

export type EngineRequest = {
  source: SourceInput;
  card_hint?: CardHint;
  targets?: RendererId[];
  runtime?: {
    provider?: string;
    model?: string;
  };
};
