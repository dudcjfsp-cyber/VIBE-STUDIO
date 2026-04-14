export type ModeId = "create" | "review";

export type RendererId =
  | "prompt"
  | "plan"
  | "architecture"
  | "review-report";

export type CardHint =
  | "idea-structuring"
  | "command-optimization"
  | "system-architecture"
  | "critical-review";

export type NextStep =
  | "direct_render"
  | "clarify_first"
  | "approval_pending";

export type ApprovalLevel = "none" | "recommended" | "required";

export type ScoreValue = 0 | 1 | 2;

export type ReasonCode = string;

export type GateSignals = {
  mode_guess: ModeId;
  provisional_renderer: RendererId;
  missing_critical_facts: boolean;
  ambiguity_score: ScoreValue;
  structure_score: ScoreValue;
  risk_score: ScoreValue;
  next_step: NextStep;
  approval_level: ApprovalLevel;
  pivot_recommended: boolean;
  pivot_reason?: string;
  reason_codes: ReasonCode[];
};
