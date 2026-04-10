import type { ClarificationQuestion } from "./clarification-question.js";
import type { ModeId, RendererId } from "./workflow-signals.js";

export type IntentIr = {
  version: 1;
  source_text: string;
  summary: string;
  mode: ModeId;
  intent: {
    goal: string;
    audience: string;
    context: string;
    output_kind: RendererId;
    tone: string;
  };
  output_contract: {
    constraints: string[];
    success_criteria: string[];
  };
  analysis: {
    risks: string[];
    assumptions: string[];
    missing_information: string[];
    clarification_questions: ClarificationQuestion[];
  };
  signals: {
    confidence: "low" | "medium" | "high";
    needs_clarification: boolean;
    ambiguity_level: "low" | "medium" | "high";
  };
};
