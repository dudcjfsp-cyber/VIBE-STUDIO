import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL(
    "../apps/product-web/src/features/studio/components/ResultPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);

assert.match(source, /schema_version:\s+"vibe_studio\.ai_work_handoff\.v2"/);
assert.match(source, /handoff_type:\s+"ai_coding_tool_context"/);
assert.match(source, /context_to_preserve:/);
assert.match(source, /implementation_boundary:/);
assert.match(source, /learning_context:/);
assert.match(source, /missing_context:/);
assert.match(source, /risky_assumptions:/);
assert.match(source, /needs_user_decision:/);
assert.match(source, /function buildExcludedScope/);
assert.match(source, /function buildCodingGuardrails/);
assert.doesNotMatch(source, /Codex 작업 지시 복사/);

console.log(
  JSON.stringify({
    handoff_schema: "vibe_studio.ai_work_handoff.v2",
    checks: [
      "uses one existing AI coding-tool copy surface",
      "keeps context, implementation boundary, learning context, and user decisions",
      "does not reintroduce a separate Codex copy button",
    ],
  }),
);
