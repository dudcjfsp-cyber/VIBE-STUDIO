import type { ClarificationQuestion } from "./clarification-question.js";

export type ValidationIssue = {
  code: string;
  severity: "low" | "medium" | "high";
  message: string;
  path?: string;
  scope: "analysis" | "output";
};

export type ValidationReport = {
  status: "ready" | "review" | "blocked";
  issues: ValidationIssue[];
  suggested_questions: ClarificationQuestion[];
};
