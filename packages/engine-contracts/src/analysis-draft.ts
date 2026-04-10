import type { ClarificationQuestion } from "./clarification-question.js";

export type AnalysisDraft = {
  summary: string;
  intent: {
    goal: string;
    audience: string;
    context: string;
    desired_output: string;
    tone: string;
  };
  constraints: string[];
  success_criteria: string[];
  risks: string[];
  assumptions: string[];
  missing_information: string[];
  candidate_questions: ClarificationQuestion[];
};
