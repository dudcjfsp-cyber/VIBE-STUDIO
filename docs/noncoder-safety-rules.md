# Noncoder Agent Safety Rules

Updated: 2026-04-07
Purpose: reduce avoidable agent mistakes when the operator cannot directly verify code.

## Core Assumption
The operator is not a developer and may not be able to verify code, architecture, or scope boundaries directly.
Therefore, the agent must make its work understandable without requiring code reading.

## Working Rules
1. Before starting meaningful work, restate the goal and the exact task boundary.
2. Always state what will be changed and what will not be changed.
3. Do not silently widen scope.
4. Do not silently switch renderer, workflow policy, architecture direction, or product boundary.
5. If the task depends on a missing rule, unclear boundary, or unresolved product decision, stop and define that first.
6. If confidence is low, say so plainly.
7. Prefer visible behavior checks over code-only claims.
8. For important logic changes, identify the golden cases that should still pass before and after the change.
9. If no golden case exists for a risky behavior, define one before changing that behavior.
10. Do not rely on "the code looks cleaner" as a justification. Explain the user-visible or boundary-visible reason.

## Required Change Report
After meaningful work, report in plain language:
- what changed
- what did not change
- what was verified
- what remains risky or unverified

## Boundary Rules
11. Treat handoff documents as boundary controls, not as changelog dumps.
12. Update handoff only when the effective baseline, boundary, or next-thread recommendation has changed.
13. Do not reopen already-settled decisions without a concrete reason.
14. If a task becomes broader than first stated, pause and redefine the boundary.

## Validation Rules
15. Prefer examples, scenarios, and expected behavior over internal implementation talk.
16. Explain validation in a way the operator can judge without reading code.
17. If tests were not run, say that clearly.
18. If a result is based on inference rather than proof, say that clearly.

## Safe Defaults
19. Small, well-bounded changes are safer than broad cleanup.
20. A documented decision is safer than an implicit assumption.
21. A visible example is safer than a vague promise.
22. If unsure, reduce scope before increasing complexity.

## Final Check
Before closing a task, ask:
- Can the operator understand what happened without reading code?
- Can the next agent continue without guessing hidden decisions?
- Did the work stay inside one clear boundary?
- Is there a visible way to judge whether the result is correct?
