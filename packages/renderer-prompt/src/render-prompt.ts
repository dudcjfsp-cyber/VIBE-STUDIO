import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";

function buildContextLines(handoff: RendererHandoff): string[] {
  const lines: string[] = [];
  const { intent_ir: intentIr } = handoff;

  if (intentIr.intent.context.trim()) {
    lines.push(`Context: ${intentIr.intent.context.trim()}`);
  }

  if (intentIr.intent.audience.trim()) {
    lines.push(`Audience: ${intentIr.intent.audience.trim()}`);
  }

  if (intentIr.intent.tone.trim()) {
    lines.push(`Tone: ${intentIr.intent.tone.trim()}`);
  }

  for (const constraint of intentIr.output_contract.constraints) {
    lines.push(`Constraint: ${constraint}`);
  }

  for (const criterion of intentIr.output_contract.success_criteria) {
    lines.push(`Success criterion: ${criterion}`);
  }

  return lines;
}

export function renderPrompt(handoff: RendererHandoff): PromptOutput {
  const contextLines = buildContextLines(handoff);
  const promptSections = [
    `You are helping with this task: ${handoff.intent_ir.intent.goal.trim()}`,
    ...contextLines,
    "Produce a clear and directly usable result.",
  ];

  const notes = [
    `Mode: ${handoff.intent_ir.mode}`,
    `Source summary: ${handoff.intent_ir.summary}`,
  ];

  if (handoff.intent_ir.analysis.risks.length > 0) {
    notes.push(`Risk note: ${handoff.intent_ir.analysis.risks.join(" ")}`);
  }

  return {
    title: "Prompt Draft",
    prompt: promptSections.join("\n"),
    notes,
  };
}
