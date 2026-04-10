import type {
  ValidationIssue,
  ValidationReport,
} from "@vive-studio/engine-contracts";

import type { ArchitectureOutput } from "./architecture-output.js";

export function validateArchitectureOutput(
  output: ArchitectureOutput,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!output.title.trim()) {
    issues.push({
      code: "architecture_output.title_missing",
      severity: "medium",
      message: "Architecture output should include a title.",
      path: "title",
      scope: "output",
    });
  }

  if (!output.system_boundary.trim()) {
    issues.push({
      code: "architecture_output.boundary_missing",
      severity: "high",
      message: "Architecture output must state the system boundary.",
      path: "system_boundary",
      scope: "output",
    });
  }

  if (output.components.length < 3) {
    issues.push({
      code: "architecture_output.components_too_small",
      severity: "high",
      message: "Architecture output must describe at least three components.",
      path: "components",
      scope: "output",
    });
  }

  output.components.forEach((component, index) => {
    if (!component.name.trim()) {
      issues.push({
        code: "architecture_output.component_name_missing",
        severity: "medium",
        message: "Each architecture component should have a name.",
        path: `components.${index}.name`,
        scope: "output",
      });
    }

    if (!component.responsibility.trim()) {
      issues.push({
        code: "architecture_output.component_responsibility_missing",
        severity: "high",
        message: "Each architecture component must describe its responsibility.",
        path: `components.${index}.responsibility`,
        scope: "output",
      });
    }
  });

  if (output.interaction_flows.length === 0) {
    issues.push({
      code: "architecture_output.flow_missing",
      severity: "high",
      message: "Architecture output must include at least one interaction flow.",
      path: "interaction_flows",
      scope: "output",
    });
  }

  output.interaction_flows.forEach((flow, index) => {
    if (!flow.name.trim()) {
      issues.push({
        code: "architecture_output.flow_name_missing",
        severity: "medium",
        message: "Each interaction flow should have a name.",
        path: `interaction_flows.${index}.name`,
        scope: "output",
      });
    }

    if (flow.steps.length < 2) {
      issues.push({
        code: "architecture_output.flow_steps_too_small",
        severity: "high",
        message: "Each interaction flow must include at least two steps.",
        path: `interaction_flows.${index}.steps`,
        scope: "output",
      });
    }
  });

  return {
    status:
      issues.some((issue) => issue.severity === "high")
        ? "blocked"
        : issues.length > 0
          ? "review"
          : "ready",
    issues,
    suggested_questions: [],
  };
}
