import assert from "node:assert/strict";

import {
  buildStage1FollowUpRequest,
  listVisibleStage1Actions,
} from "../packages/engine-contracts/dist/index.js";
import { createEngine } from "../packages/engine-core/dist/index.js";
import { architectureRenderer } from "../packages/renderer-architecture/dist/index.js";
import { planRenderer } from "../packages/renderer-plan/dist/index.js";
import { reviewReportRenderer } from "../packages/renderer-review-report/dist/index.js";
import { runStage1FollowUp } from "../apps/product-server/dist/run-stage1-follow-up.js";

const reviewEngine = createEngine({
  renderers: {
    "review-report": reviewReportRenderer,
  },
});

const planEngine = createEngine({
  renderers: {
    plan: planRenderer,
  },
});

const architectureEngine = createEngine({
  renderers: {
    architecture: architectureRenderer,
  },
});

const reviewResult = await reviewEngine.run({
  source: {
    text: 'Look at this prompt and tell me what is wrong: "Write a friendly introduction"',
  },
});

assert.equal(reviewResult.outputs[0]?.renderer, "review-report");
assert.deepEqual(
  listVisibleStage1Actions(reviewResult).map((action) => action.action_id),
  ["revise-from-review"],
);

const reviewFollowUpRequest = buildStage1FollowUpRequest(
  reviewResult,
  "revise-from-review",
);

assert.ok(reviewFollowUpRequest);
assert.equal(reviewFollowUpRequest.renderer, "review-report");
assert.equal(reviewFollowUpRequest.selected_action, "revise-from-review");
assert.equal(reviewFollowUpRequest.policy_context.max_follow_up_results, 1);
assert.equal(reviewFollowUpRequest.policy_context.allow_freeform_instruction, false);

const reviewFollowUp = await runStage1FollowUp(reviewFollowUpRequest, {
  provider: "local",
});

assert.equal(reviewFollowUp.action_id, "revise-from-review");
assert.equal(reviewFollowUp.source_result_ref.renderer, "review-report");
assert.ok(reviewFollowUp.result_body.trim().length > 0);
assert.ok(reviewFollowUp.change_summary.length >= 1);
assert.ok(!reviewFollowUp.result_body.includes("This revision keeps the original direction"));
assert.ok(!reviewFollowUp.result_body.includes("what is wrong"));
assert.ok(
  reviewFollowUp.result_body.includes("A clearer draft.") ||
    reviewFollowUp.result_body.includes("productivity app"),
);

const planApprovalPending = await planEngine.run({
  source: {
    text: "아이디어를 서비스 기획처럼 정리해줘. 문제는 혼자 운동 습관을 만들기 어렵다는 점이고, 대상 사용자는 혼자 운동하는 초보자야. 범위는 MVP 앱 기획이고, 목표는 운동 기록을 쉽게 남기고 진행 변화를 보게 하는 거야.",
  },
});

assert.equal(planApprovalPending.next_step, "approval_pending");
assert.equal(listVisibleStage1Actions(planApprovalPending).length, 0);

const planResult = await planEngine.run(
  {
    source: {
      text: "아이디어를 서비스 기획처럼 정리해줘. 문제는 혼자 운동 습관을 만들기 어렵다는 점이고, 대상 사용자는 혼자 운동하는 초보자야. 범위는 MVP 앱 기획이고, 목표는 운동 기록을 쉽게 남기고 진행 변화를 보게 하는 거야.",
    },
  },
  {
    approval: {
      recommended: true,
    },
  },
);

assert.equal(planResult.outputs[0]?.renderer, "plan");
assert.deepEqual(
  listVisibleStage1Actions(planResult).map((action) => action.action_id),
  ["expand-plan-detail"],
);

const planFollowUpRequest = buildStage1FollowUpRequest(
  planResult,
  "expand-plan-detail",
);

assert.ok(planFollowUpRequest);
assert.equal(planFollowUpRequest.renderer, "plan");

const planFollowUp = await runStage1FollowUp(planFollowUpRequest, {
  provider: "local",
});

assert.equal(planFollowUp.action_id, "expand-plan-detail");
assert.equal(planFollowUp.result_kind, "expanded-plan");
assert.ok(
  planFollowUp.result_body.includes("Expanded Plan Draft") ||
    planFollowUp.result_body.includes("확장된 계획 초안"),
);
assert.ok(planFollowUp.change_summary.length >= 1);

const architectureClarify = await architectureEngine.run({
  source: {
    text: "앱 만들고 싶어. 사용자용 화면, 사장님용 화면, 결제, 알림이 들어가. 전체 구조를 먼저 잡아줘.",
  },
});

assert.equal(architectureClarify.next_step, "clarify_first");
assert.equal(listVisibleStage1Actions(architectureClarify).length, 0);

const architectureApprovalPending = await architectureEngine.run({
  source: {
    text: "주문 관리 앱 전체 구조를 잡아줘. 사용자, 점주, 관리자 화면이 있고 주문 생성, 결제 확인, 주문 상태 알림 흐름을 다뤄줘.",
  },
});

assert.equal(architectureApprovalPending.next_step, "approval_pending");
assert.equal(listVisibleStage1Actions(architectureApprovalPending).length, 0);

const architectureResult = await architectureEngine.run(
  {
    source: {
      text: "주문 관리 앱 전체 구조를 잡아줘. 범위는 사용자, 점주, 관리자 페이지, 결제 서비스, 알림 서비스고 주문 생성, 결제 확인, 주문 상태 알림 흐름을 설명해줘.",
    },
  },
  {
    approval: {
      required: true,
    },
  },
);

assert.equal(architectureResult.outputs[0]?.renderer, "architecture");
assert.deepEqual(
  listVisibleStage1Actions(architectureResult).map((action) => action.action_id),
  ["expand-architecture-detail"],
);

const architectureFollowUpRequest = buildStage1FollowUpRequest(
  architectureResult,
  "expand-architecture-detail",
);

assert.ok(architectureFollowUpRequest);
assert.equal(architectureFollowUpRequest.renderer, "architecture");
assert.equal(
  architectureFollowUpRequest.policy_context.default_expansion_focus,
  "flow-detail",
);

const architectureFollowUp = await runStage1FollowUp(
  architectureFollowUpRequest,
  {
    provider: "local",
  },
);

assert.equal(architectureFollowUp.action_id, "expand-architecture-detail");
assert.equal(architectureFollowUp.result_kind, "expanded-architecture");
assert.equal(architectureFollowUp.source_result_ref.renderer, "architecture");
assert.ok(
  architectureFollowUp.result_body.includes("flow-detail") ||
    architectureFollowUp.result_body.includes("세부 설계"),
);
assert.ok(
  architectureFollowUp.remaining_questions.some(
    (item) =>
      item.includes("API") ||
      item.includes("data") ||
      item.includes("코드 생성") ||
      item.includes("implementation"),
  ),
);

console.log(
  JSON.stringify({
    review_stage1: {
      action_ids: listVisibleStage1Actions(reviewResult).map(
        (action) => action.action_id,
      ),
      follow_up_kind: reviewFollowUp.result_kind,
      change_summary_count: reviewFollowUp.change_summary.length,
    },
    plan_stage1: {
      gated_action_count: listVisibleStage1Actions(planApprovalPending).length,
      action_ids: listVisibleStage1Actions(planResult).map(
        (action) => action.action_id,
      ),
      follow_up_kind: planFollowUp.result_kind,
    },
    architecture_stage1: {
      clarify_action_count: listVisibleStage1Actions(architectureClarify).length,
      gated_action_count: listVisibleStage1Actions(architectureApprovalPending).length,
      action_ids: listVisibleStage1Actions(architectureResult).map(
        (action) => action.action_id,
      ),
      follow_up_kind: architectureFollowUp.result_kind,
      out_of_scope_count: architectureFollowUp.remaining_questions.length,
    },
  }),
);
