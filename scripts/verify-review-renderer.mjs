import assert from "node:assert/strict";

import { createEngine } from "../packages/engine-core/dist/index.js";
import { reviewReportRenderer } from "../packages/renderer-review-report/dist/index.js";

const engine = createEngine({
  renderers: {
    "review-report": reviewReportRenderer,
  },
});

const result = await engine.run({
  source: {
    text: '\uB0B4\uAC00 \uC368\uBCF8 \uD504\uB86C\uD504\uD2B8\uAC00 \uC774\uC0C1\uD55C\uC9C0 \uBD10\uC918: "\uCE5C\uADFC\uD558\uAC8C \uC18C\uAC1C\uAE00 \uC368\uC918"',
  },
});

assert.equal(result.mode_guess, "review");
assert.equal(result.provisional_renderer, "review-report");
assert.equal(result.next_step, "direct_render");
assert.equal(result.outputs.length, 1);
assert.equal(result.outputs[0]?.renderer, "review-report");
assert.equal(result.outputs[0]?.validation.status, "ready");

const reviewOutput = result.outputs[0]?.output;

assert.ok(reviewOutput);
assert.equal(reviewOutput.title, "Review Report");
assert.equal(reviewOutput.verdict, "needs-revision");
assert.ok(reviewOutput.findings.length >= 2);
assert.ok(
  reviewOutput.findings.some((finding) => finding.severity === "high"),
);
assert.ok(
  reviewOutput.findings.some((finding) =>
    finding.detail.trim().length > 0 &&
    finding.recommendation.trim().length > 0,
  ),
);
assert.ok(
  reviewOutput.findings.some((finding) =>
    finding.detail.includes('"') || finding.detail.includes("tokens"),
  ),
);
assert.ok(
  reviewOutput.notes.some((note) => note.startsWith("Artifact excerpt: ")),
);
assert.ok(
  reviewOutput.notes.some((note) => note.startsWith("Finding profile: ")),
);
assert.ok(
  reviewOutput.notes.some((note) => note.startsWith("Artifact size: ")),
);
assert.ok(
  reviewOutput.notes.some((note) => note.startsWith("Artifact kind: ")),
);
assert.ok(
  reviewOutput.findings.some(
    (finding) => finding.title === "Review target is too thin",
  ),
);

const fullerResult = await engine.run({
  source: {
    text:
      '\uC774 \uC571 \uC18C\uAC1C\uBB38 \uCD08\uC548\uC774 \uBE60\uC9C4 \uAC8C \uC788\uB294\uC9C0 \uBD10\uC918: "\uBC14\uC05C \uC9C1\uC7A5\uC778\uB4E4\uC774 \uC6B4\uB3D9 \uAE30\uB85D\uC744 \uC27D\uAC8C \uB0A8\uAE30\uAC8C \uB3C4\uC640\uC8FC\uB294 \uC571 \uC18C\uAC1C\uBB38 \uCD08\uC548\uC785\uB2C8\uB2E4. \uC571\uC2A4\uD1A0\uC5B4 \uCCAB \uD654\uBA74\uC6A9\uC774\uB77C \uCC98\uC74C \uBCF4\uB294 \uC0AC\uB78C\uB3C4 \uBC14\uB85C \uC774\uD574\uB418\uAC8C, \uCE5C\uADFC\uD558\uC9C0\uB9CC \uACFC\uC7A5 \uC5C6\uC774 \uC18C\uAC1C\uD574 \uC8FC\uC138\uC694."',
  },
});

assert.equal(fullerResult.mode_guess, "review");
assert.equal(fullerResult.provisional_renderer, "review-report");
assert.equal(fullerResult.next_step, "direct_render");
assert.equal(fullerResult.outputs.length, 1);
assert.equal(fullerResult.outputs[0]?.renderer, "review-report");
assert.equal(fullerResult.outputs[0]?.validation.status, "ready");

const fullerOutput = fullerResult.outputs[0]?.output;

assert.ok(fullerOutput);
assert.equal(fullerOutput.verdict, "usable-with-fixes");
assert.ok(fullerOutput.findings.length >= 1);
assert.ok(
  fullerOutput.findings.every((finding) => finding.severity !== "high"),
);
assert.ok(
  fullerOutput.notes.some((note) =>
    note.startsWith("Review focus: clarity, audience fit, completeness"),
  ),
);
assert.ok(
  fullerOutput.notes.some(
    (note) =>
      note.startsWith("Coverage gaps: ") ||
      note.startsWith("Coverage snapshot: "),
  ),
);
assert.ok(
  fullerOutput.notes.some((note) => note.startsWith("Artifact kind: ")),
);

const polishedResult = await engine.run({
  source: {
    text:
      '이 앱 소개문 초안 검토해줘: "운동 기록 앱 소개문 초안입니다. 앱스토어 첫 화면에서 처음 보는 직장인도 바로 이해할 수 있게, 운동 기록을 빠르게 남기고 주간 변화를 한눈에 확인할 수 있다는 점을 친근하지만 과장 없이 소개해 주세요. 한 문단으로 써 주세요."',
  },
});

assert.equal(polishedResult.mode_guess, "review");
assert.equal(polishedResult.provisional_renderer, "review-report");
assert.equal(polishedResult.next_step, "direct_render");
assert.equal(polishedResult.outputs.length, 1);
assert.equal(polishedResult.outputs[0]?.renderer, "review-report");
assert.equal(polishedResult.outputs[0]?.validation.status, "ready");

const polishedOutput = polishedResult.outputs[0]?.output;

assert.ok(polishedOutput);
assert.equal(polishedOutput.verdict, "usable-with-fixes");
assert.ok(polishedOutput.findings.length >= 1);
assert.ok(
  polishedOutput.findings.every((finding) => finding.severity === "low"),
);
assert.ok(
  polishedOutput.notes.some((note) =>
    note.startsWith("Artifact kind: product-copy"),
  ),
);
assert.ok(
  polishedOutput.notes.some((note) =>
    note.startsWith("Coverage snapshot: "),
  ),
);

console.log(
  JSON.stringify({
    direct_review_render: {
      mode_guess: result.mode_guess,
      next_step: result.next_step,
      output_count: result.outputs.length,
      output_validation: result.outputs[0]?.validation.status,
      finding_count: reviewOutput.findings.length,
      verdict: reviewOutput.verdict,
    },
    fuller_review_render: {
      mode_guess: fullerResult.mode_guess,
      next_step: fullerResult.next_step,
      output_count: fullerResult.outputs.length,
      output_validation: fullerResult.outputs[0]?.validation.status,
      finding_count: fullerOutput.findings.length,
      verdict: fullerOutput.verdict,
    },
    polished_review_render: {
      mode_guess: polishedResult.mode_guess,
      next_step: polishedResult.next_step,
      output_count: polishedResult.outputs.length,
      output_validation: polishedResult.outputs[0]?.validation.status,
      finding_count: polishedOutput.findings.length,
      verdict: polishedOutput.verdict,
    },
  }),
);
