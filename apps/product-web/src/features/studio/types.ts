import type {
  ApprovalLevel,
  CardHint,
  EngineResult,
  NextStep,
  RendererId,
} from "@vive-studio/engine-contracts";

export type FlowStage = "start" | "clarify" | "approval" | "result";

export type StartTemplateId =
  | "free"
  | "prompt"
  | "plan"
  | "architecture"
  | "review";

export type StartTemplateField = {
  helper?: string;
  id: string;
  label: string;
  optional?: boolean;
  placeholder: string;
};

export type StartTemplate = {
  cardHint?: CardHint;
  description: string;
  fields: StartTemplateField[];
  id: StartTemplateId;
  label: string;
  title: string;
  buildInput(values: Record<string, string>): string;
};

export type StageSnapshot = {
  approvalLevel: ApprovalLevel;
  nextStep: NextStep;
  result?: EngineResult;
  runId?: string;
  stage: FlowStage;
  targetRenderer?: RendererId;
};
