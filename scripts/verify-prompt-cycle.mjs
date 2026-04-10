import assert from "node:assert/strict";

import { createEngine } from "../packages/engine-core/dist/index.js";
import { promptRenderer } from "../packages/renderer-prompt/dist/index.js";

const engine = createEngine({
  renderers: {
    prompt: promptRenderer,
  },
});

const directRenderResult = await engine.run({
  source: {
    text: "회의 전에 내가 뭘 물어봐야 할지 정리해주는 프롬프트 만들어줘",
  },
});

assert.equal(directRenderResult.next_step, "direct_render");
assert.equal(directRenderResult.outputs.length, 1);
assert.equal(directRenderResult.outputs[0]?.renderer, "prompt");
assert.equal(directRenderResult.outputs[0]?.validation.status, "ready");

const gatedResult = await engine.run({
  source: {
    text: "결제가 두 번 된 고객들에게 보내는 사과 공지문이 필요해. 오늘 오전 10시부터 11시 사이 결제한 일부 고객이 대상이고, 중복 결제는 전액 환불된다고 써줘.",
  },
});

assert.equal(gatedResult.next_step, "approval_pending");
assert.equal(gatedResult.approval_level, "required");
assert.equal(gatedResult.outputs.length, 0);

const clarifyResult = await engine.run({
  source: {
    text: "내가 만들고 싶은 앱이 있는데 사용자용 화면, 가게용 화면, 결제, 알림이 다 들어가. 전체 구조를 먼저 잡아줘.",
  },
});

assert.equal(clarifyResult.next_step, "clarify_first");
assert.equal(clarifyResult.outputs.length, 0);

const approvedResult = await engine.run(
  {
    source: {
      text: "결제가 두 번 된 고객들에게 보내는 사과 공지문이 필요해. 오늘 오전 10시부터 11시 사이 결제한 일부 고객이 대상이고, 중복 결제는 전액 환불된다고 써줘.",
    },
  },
  {
    approval: {
      required: true,
    },
  },
);

assert.equal(approvedResult.outputs.length, 1);
assert.equal(approvedResult.outputs[0]?.renderer, "prompt");
assert.equal(approvedResult.outputs[0]?.validation.status, "ready");

console.log(
  JSON.stringify({
    direct_render: {
      next_step: directRenderResult.next_step,
      output_count: directRenderResult.outputs.length,
      output_validation: directRenderResult.outputs[0]?.validation.status,
    },
    approval_pending_without_confirmation: {
      next_step: gatedResult.next_step,
      approval_level: gatedResult.approval_level,
      output_count: gatedResult.outputs.length,
    },
    clarify_first_without_render: {
      next_step: clarifyResult.next_step,
      output_count: clarifyResult.outputs.length,
    },
    approval_pending_with_confirmation: {
      next_step: approvedResult.next_step,
      approval_level: approvedResult.approval_level,
      output_count: approvedResult.outputs.length,
      output_validation: approvedResult.outputs[0]?.validation.status,
    },
  }),
);
