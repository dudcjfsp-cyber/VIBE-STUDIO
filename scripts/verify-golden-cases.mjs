import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEngine } from "../packages/engine-core/dist/index.js";
import { architectureRenderer } from "../packages/renderer-architecture/dist/index.js";
import { promptRenderer } from "../packages/renderer-prompt/dist/index.js";
import { reviewReportRenderer } from "../packages/renderer-review-report/dist/index.js";
import { specRenderer } from "../packages/renderer-spec/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const goldenCasesPath = path.join(__dirname, "..", "docs", "golden-cases.md");

const CARD_HINT_MAP = {
  "아이디어 정리": "idea-structuring",
  "프롬프트 만들기": "command-optimization",
  "구조 설계": "system-architecture",
  검토: "critical-review",
};

const EXPECTED_KEYS = [
  "mode_guess",
  "provisional_renderer",
  "missing_critical_facts",
  "ambiguity_score",
  "structure_score",
  "risk_score",
  "next_step",
  "approval_level",
  "pivot_recommended",
];

function parseScalarValue(rawValue) {
  const trimmed = rawValue.trim();

  if (trimmed === "none") {
    return undefined;
  }

  const backtickMatch = trimmed.match(/^`(.+)`$/);
  const value = backtickMatch ? backtickMatch[1] : trimmed;

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseCases(markdown) {
  const cases = [];

  for (const block of markdown.split(/^### Case /m).slice(1)) {
    const firstLineBreak = block.indexOf("\n");

    if (firstLineBreak === -1) {
      continue;
    }

    const header = block.slice(0, firstLineBreak).trim();
    const body = block.slice(firstLineBreak + 1);
    const headerMatch = header.match(/^(\d+): (.+)$/);

    if (!headerMatch) {
      continue;
    }

    const [, idText, name] = headerMatch;
    const parsed = {
      id: Number(idText),
      name: name.trim(),
      selectedCard: undefined,
      input: undefined,
      expected: {},
    };

    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith("- ")) {
        continue;
      }

      const fieldMatch = line.match(/^- ([^:]+): (.+)$/);

      if (!fieldMatch) {
        continue;
      }

      const [, key, rawValue] = fieldMatch;

      if (key === "Input") {
        parsed.input = parseScalarValue(rawValue);
        continue;
      }

      if (key === "Selected card") {
        parsed.selectedCard = parseScalarValue(rawValue);
        continue;
      }

      const expectedMatch = key.match(/^Expected `(.+)`$/);

      if (expectedMatch) {
        parsed.expected[expectedMatch[1]] = parseScalarValue(rawValue);
      }
    }

    cases.push(parsed);
  }

  return cases;
}

function buildRequest(testCase) {
  const request = {
    source: {
      text: testCase.input,
    },
  };

  if (typeof testCase.selectedCard === "string") {
    const cardHint = CARD_HINT_MAP[testCase.selectedCard];

    if (!cardHint) {
      throw new Error(`Unsupported selected card label: ${testCase.selectedCard}`);
    }

    request.card_hint = cardHint;
  }

  return request;
}

function validateParsedCases(cases) {
  if (cases.length === 0) {
    throw new Error("No golden cases were parsed from docs/golden-cases.md");
  }

  for (const testCase of cases) {
    if (typeof testCase.input !== "string" || testCase.input.length === 0) {
      throw new Error(`Case ${testCase.id} is missing an input value.`);
    }

    for (const key of EXPECTED_KEYS) {
      if (!(key in testCase.expected)) {
        throw new Error(
          `Case ${testCase.id} is missing expected field: ${key}`,
        );
      }
    }
  }
}

const markdown = await fs.readFile(goldenCasesPath, "utf8");
const cases = parseCases(markdown);

validateParsedCases(cases);

const engine = createEngine({
  renderers: {
    prompt: promptRenderer,
    spec: specRenderer,
    architecture: architectureRenderer,
    "review-report": reviewReportRenderer,
  },
});

const results = [];

for (const testCase of cases) {
  const result = await engine.run(buildRequest(testCase));

  for (const key of EXPECTED_KEYS) {
    assert.deepEqual(
      result[key],
      testCase.expected[key],
      `Case ${testCase.id} ${testCase.name}: expected ${key}=${JSON.stringify(
        testCase.expected[key],
      )} but got ${JSON.stringify(result[key])}`,
    );
  }

  results.push({
    id: testCase.id,
    name: testCase.name,
    mode_guess: result.mode_guess,
    provisional_renderer: result.provisional_renderer,
    next_step: result.next_step,
    approval_level: result.approval_level,
    pivot_recommended: result.pivot_recommended,
    output_count: result.outputs.length,
  });
}

console.log(
  JSON.stringify(
    {
      source: "docs/golden-cases.md",
      passed: results.length,
      results,
    },
    null,
    2,
  ),
);
