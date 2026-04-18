import assert from "node:assert/strict";

import { createEngine } from "../packages/engine-core/dist/index.js";
import { architectureRenderer } from "../packages/renderer-architecture/dist/index.js";

const engine = createEngine({
  renderers: {
    architecture: architectureRenderer,
  },
});

const goldenCaseRequest = {
  source: {
    text: "내가 만들고 싶은 앱이 있는데 사용자용 화면, 가게용 화면, 결제, 알림이 다 들어가. 전체 구조를 먼저 잡아줘.",
  },
};

const goldenCaseResult = await engine.run(goldenCaseRequest);

assert.equal(goldenCaseResult.provisional_renderer, "architecture");
assert.equal(goldenCaseResult.next_step, "clarify_first");
assert.equal(goldenCaseResult.outputs.length, 0);

const renderableRequest = {
  source: {
    text: "주문 관리 앱 전체 구조를 잡아줘. 범위는 사용자 앱, 점주 앱, 관리자 페이지, 결제 서비스, 알림 서비스고 주문 생성, 결제 승인, 주문 상태 알림 흐름에 집중해줘.",
  },
};

const gatedResult = await engine.run(renderableRequest);

assert.equal(gatedResult.provisional_renderer, "architecture");
assert.equal(gatedResult.next_step, "approval_pending");
assert.equal(gatedResult.approval_level, "required");
assert.equal(gatedResult.outputs.length, 0);

const approvedResult = await engine.run(renderableRequest, {
  approval: {
    required: true,
  },
});

assert.equal(approvedResult.outputs.length, 1);
assert.equal(approvedResult.outputs[0]?.renderer, "architecture");
assert.equal(approvedResult.outputs[0]?.validation.status, "ready");

const architectureOutput = approvedResult.outputs[0]?.output;

assert.ok(architectureOutput);
assert.ok(architectureOutput.title.trim().length > 0);
assert.ok(architectureOutput.components.length >= 3);
assert.ok(architectureOutput.interaction_flows.length >= 1);

console.log(
  JSON.stringify({
    golden_case_clarify_first: {
      next_step: goldenCaseResult.next_step,
      provisional_renderer: goldenCaseResult.provisional_renderer,
      output_count: goldenCaseResult.outputs.length,
    },
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
      component_count: architectureOutput.components.length,
      flow_count: architectureOutput.interaction_flows.length,
    },
  }),
);
