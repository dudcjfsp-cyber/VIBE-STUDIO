import type { ApprovalLevel, EngineResult, NextStep, RendererId } from "@vive-studio/engine-contracts";

export type FlowStage = "start" | "clarify" | "approval" | "result";

export type HintOption = {
  cardHint?: "idea-structuring" | "command-optimization" | "system-architecture" | "critical-review";
  id: string;
  label: string;
  prompt: string;
};

export type StartExample = {
  cardHint?: "idea-structuring" | "command-optimization" | "system-architecture" | "critical-review";
  description: string;
  directionLabel: string;
  id: string;
  text: string;
  title: string;
};

export type StageSnapshot = {
  approvalLevel: ApprovalLevel;
  nextStep: NextStep;
  result?: EngineResult;
  runId?: string;
  stage: FlowStage;
  targetRenderer?: RendererId;
};
