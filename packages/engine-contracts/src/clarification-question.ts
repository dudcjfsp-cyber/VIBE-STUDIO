export type ClarificationQuestion = {
  id: string;
  question: string;
  reason: string;
  improves: string;
  intent_key: string;
  priority: "high" | "medium" | "low";
};
