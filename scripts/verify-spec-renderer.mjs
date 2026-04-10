import assert from "node:assert/strict";

import { createEngine } from "../packages/engine-core/dist/index.js";
import { specRenderer } from "../packages/renderer-spec/dist/index.js";

const engine = createEngine({
  renderers: {
    spec: specRenderer,
  },
});

const request = {
  source: {
    text: "이 아이디어를 서비스 기획처럼 정리해줘. 혼자 사는 사람들이 남는 반찬을 이웃끼리 나누는 앱이야.",
  },
};

const gatedResult = await engine.run(request);

assert.equal(gatedResult.provisional_renderer, "spec");
assert.equal(gatedResult.next_step, "approval_pending");
assert.equal(gatedResult.approval_level, "recommended");
assert.equal(gatedResult.outputs.length, 0);

const approvedResult = await engine.run(request, {
  approval: {
    recommended: true,
  },
});

assert.equal(approvedResult.outputs.length, 1);
assert.equal(approvedResult.outputs[0]?.renderer, "spec");
assert.equal(approvedResult.outputs[0]?.validation.status, "ready");

const specOutput = approvedResult.outputs[0]?.output;

assert.ok(specOutput);
assert.equal(specOutput.title, "Structured Plan Draft");
assert.ok(specOutput.sections.length >= 3);

console.log(
  JSON.stringify({
    approval_pending_without_confirmation: {
      next_step: gatedResult.next_step,
      approval_level: gatedResult.approval_level,
      output_count: gatedResult.outputs.length,
    },
    approval_pending_with_confirmation: {
      next_step: approvedResult.next_step,
      approval_level: approvedResult.approval_level,
      output_count: approvedResult.outputs.length,
      output_validation: approvedResult.outputs[0]?.validation.status,
      section_count: specOutput.sections.length,
    },
  }),
);
