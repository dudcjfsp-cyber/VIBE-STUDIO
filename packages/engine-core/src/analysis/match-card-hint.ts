import type {
  CardHint,
  ModeId,
  RendererId,
} from "@vive-studio/engine-contracts";

export type CardIntent = {
  mode: ModeId;
  renderer: RendererId;
};

const CARD_HINT_MAP: Record<CardHint, CardIntent> = {
  "idea-structuring": {
    mode: "create",
    renderer: "plan",
  },
  "command-optimization": {
    mode: "create",
    renderer: "prompt",
  },
  "system-architecture": {
    mode: "create",
    renderer: "architecture",
  },
  "critical-review": {
    mode: "review",
    renderer: "review-report",
  },
};

export function matchCardHint(cardHint?: CardHint): CardIntent | undefined {
  if (!cardHint) {
    return undefined;
  }

  return CARD_HINT_MAP[cardHint];
}
