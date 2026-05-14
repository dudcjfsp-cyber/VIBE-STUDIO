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

  if (output.actors.length === 0) {
    issues.push({
      code: "architecture_output.actors_missing",
      severity: "medium",
      message: "Architecture output should name the main actors.",
      path: "actors",
      scope: "output",
    });
  }

  output.actors.forEach((actor, index) => {
    if (!actor.name.trim()) {
      issues.push({
        code: "architecture_output.actor_name_missing",
        severity: "medium",
        message: "Each architecture actor should have a name.",
        path: `actors.${index}.name`,
        scope: "output",
      });
    }

    if (!actor.role.trim()) {
      issues.push({
        code: "architecture_output.actor_role_missing",
        severity: "medium",
        message: "Each architecture actor should describe its role.",
        path: `actors.${index}.role`,
        scope: "output",
      });
    }
  });

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

  if (output.mvp_exclusions.length === 0) {
    issues.push({
      code: "architecture_output.mvp_exclusions_missing",
      severity: "medium",
      message: "Architecture output should state what is excluded from the MVP.",
      path: "mvp_exclusions",
      scope: "output",
    });
  }

  if (output.later_decisions.length === 0) {
    issues.push({
      code: "architecture_output.later_decisions_missing",
      severity: "medium",
      message: "Architecture output should leave later decisions explicit.",
      path: "later_decisions",
      scope: "output",
    });
  }

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
