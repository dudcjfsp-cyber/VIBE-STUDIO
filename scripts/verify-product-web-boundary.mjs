import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const startPanelSource = await readFile(
  new URL(
    "../apps/product-web/src/features/studio/components/StartPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);
const startTemplatesSource = await readFile(
  new URL(
    "../apps/product-web/src/features/studio/data/startTemplates.ts",
    import.meta.url,
  ),
  "utf8",
);
const resultPanelSource = await readFile(
  new URL(
    "../apps/product-web/src/features/studio/components/ResultPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);

assert.match(startPanelSource, /const beginnerTemplateIds:[\s\S]*\["free", "prompt", "plan"\]/);
assert.match(startPanelSource, /advanced-start-disclosure/);
assert.match(startPanelSource, /provider-disclosure/);
assert.match(startPanelSource, /<span>고급 설정<\/span>/);
assert.match(startPanelSource, /ProviderSessionPanel/);
assert.match(startPanelSource, /부족한 부분은 결과 안에서 조심스럽게 짚어드립니다/);
assert.doesNotMatch(startPanelSource, /approval-card|clarify-card|question-card/);

for (const templateId of ["free", "prompt", "plan", "architecture", "review"]) {
  assert.match(startTemplatesSource, new RegExp(`id:\\s+"${templateId}"`));
}
assert.match(startTemplatesSource, /cardHint:\s+"command-optimization"/);
assert.match(startTemplatesSource, /cardHint:\s+"idea-structuring"/);
assert.match(startTemplatesSource, /cardHint:\s+"system-architecture"/);
assert.match(startTemplatesSource, /cardHint:\s+"critical-review"/);

for (const title of [
  "내가 이해한 요청",
  "추천 작업 형태",
  "왜 이 방향인지",
  "결과 초안",
  "빠진 정보",
  "조심해야 할 추측",
  "다음에 더 잘 요청하려면",
]) {
  assert.match(resultPanelSource, new RegExp(title));
}

const contextPanelIndex = resultPanelSource.indexOf("intent-context-panel");
const resultDraftIntroIndex = resultPanelSource.indexOf("result-draft-intro");
const resultBodyIndex = resultPanelSource.indexOf("result-body");
const resultNotePanelIndex = resultPanelSource.indexOf("result-note-panel");
const inputHintsPanelIndex = resultPanelSource.indexOf("input-hints-panel");
const followUpActionsIndex = resultPanelSource.indexOf("follow-up-actions");
assert.ok(contextPanelIndex >= 0, "Result context layer should exist.");
assert.ok(resultDraftIntroIndex >= 0, "Result draft intro should exist.");
assert.ok(resultBodyIndex >= 0, "Renderer result body should exist.");
assert.ok(resultNotePanelIndex >= 0, "Result note panel should exist.");
assert.ok(inputHintsPanelIndex >= 0, "Next-input hints should exist.");
assert.ok(followUpActionsIndex >= 0, "Follow-up actions should exist.");
assert.ok(
  contextPanelIndex < resultDraftIntroIndex &&
    resultDraftIntroIndex < resultBodyIndex &&
    resultBodyIndex < resultNotePanelIndex &&
    resultNotePanelIndex < inputHintsPanelIndex &&
    inputHintsPanelIndex < followUpActionsIndex,
  "Product-web result should read as context -> draft -> notes -> next-input hints -> optional follow-up action.",
);

assert.match(resultPanelSource, /copy-review-dialog/);
assert.match(resultPanelSource, /내용 보고 복사하기/);
assert.match(resultPanelSource, /source_result_ref/);
assert.match(
  resultPanelSource,
  /원본 \{formatRendererLabel\(followUp\.source_result_ref\.renderer\)\}/,
);
assert.match(resultPanelSource, /<FollowUpBody followUp=\{followUp\} \/>/);
assert.match(resultPanelSource, /원본 결과와 섞이지 않도록 후속 결과는 한 번에 1개만 만듭니다/);
assert.match(resultPanelSource, /한 번 더 살펴보기/);
assert.match(resultPanelSource, /정리 기준과 확인할 점/);
const resultDraftIntroSource = resultPanelSource.slice(
  resultDraftIntroIndex,
  resultBodyIndex,
);
assert.doesNotMatch(
  resultDraftIntroSource,
  /API\s*(?:키|key)?|provider|model|모델\s*(?:설정|연결)|외부\s*AI\s*연결/iu,
);
assert.doesNotMatch(resultPanelSource, /Stage 1에서는/);

const planSectionsIndex = resultPanelSource.indexOf(
  '(output.output as PlanOutput).sections.map',
);
const codingToolPanelIndex = resultPanelSource.indexOf("coding-tool-panel");
assert.ok(planSectionsIndex >= 0, "Plan result sections should be rendered.");
assert.ok(codingToolPanelIndex >= 0, "Coding-tool handoff panel should exist.");
assert.ok(
  planSectionsIndex < codingToolPanelIndex,
  "Coding-tool handoff should stay after the plan result, not before it.",
);

assert.match(resultPanelSource, /AI 코딩툴에 넣을 내용/);
assert.match(resultPanelSource, /Codex 작업 지시 복사/);
assert.match(resultPanelSource, /function buildCodingToolPayloadText/);
assert.match(resultPanelSource, /function buildCodexHandoffText/);
assert.doesNotMatch(resultPanelSource, /render\(\)\s*=>\s*buildCodingToolPayloadText/);

console.log(
  JSON.stringify({
    boundary: "product-web beginner flow",
    checks: [
      "keeps beginner start templates and advanced options separated",
      "keeps result context layer before renderer-specific interpretation",
      "keeps result draft and notes before next-input hints and optional follow-up action",
      "keeps coding-tool handoff after the plan result",
      "keeps follow-up results separate from the source result",
      "keeps internal stage labels out of the visible follow-up limit copy",
    ],
  }),
);
