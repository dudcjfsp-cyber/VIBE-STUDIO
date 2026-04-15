import { useMemo, useState } from "react";
import type { CardHint, EngineRequest, EngineResult } from "@vive-studio/engine-contracts";

import { productEngine } from "../../../lib/engine/createProductEngine";
import type { StageSnapshot } from "../types";

type SubmitOptions = {
  cardHint?: CardHint;
  text: string;
};

export function useStudioFlow() {
  const [input, setInput] = useState("");
  const [selectedHint, setSelectedHint] = useState<CardHint | undefined>();
  const [snapshot, setSnapshot] = useState<StageSnapshot>({
    stage: "start",
    nextStep: "direct_render",
    approvalLevel: "none",
  });
  const [isBusy, setIsBusy] = useState(false);

  const canSubmit = input.trim().length > 0 && !isBusy;

  const request = useMemo<EngineRequest | undefined>(() => {
    if (!input.trim()) {
      return undefined;
    }

    return {
      source: {
        text: input.trim(),
      },
      ...(selectedHint ? { card_hint: selectedHint } : {}),
    };
  }, [input, selectedHint]);

  async function advance(
    nextRequest: EngineRequest,
    approval?: { recommended?: boolean; required?: boolean },
  ) {
    setIsBusy(true);

    try {
      const result = await productEngine.run(nextRequest, approval ? { approval } : undefined);
      setSnapshot(mapResultToStage(result));
    } finally {
      setIsBusy(false);
    }
  }

  async function submit(options?: SubmitOptions) {
    const nextText = options?.text ?? input;
    const nextHint = options?.cardHint ?? selectedHint;
    const nextRequest: EngineRequest = {
      source: {
        text: nextText.trim(),
      },
      ...(nextHint ? { card_hint: nextHint } : {}),
    };

    setInput(nextText);
    setSelectedHint(nextHint);

    await advance(nextRequest);
  }

  async function continueAfterApproval(level: "recommended" | "required") {
    if (!request) {
      return;
    }

    await advance(
      request,
      level === "required" ? { required: true } : { recommended: true },
    );
  }

  function reset() {
    setInput("");
    setSelectedHint(undefined);
    setSnapshot({
      stage: "start",
      nextStep: "direct_render",
      approvalLevel: "none",
    });
  }

  return {
    canSubmit,
    continueAfterApproval,
    input,
    isBusy,
    request,
    reset,
    selectedHint,
    setInput,
    setSelectedHint,
    snapshot,
    submit,
  };
}

function mapResultToStage(result: EngineResult): StageSnapshot {
  if (result.outputs.length > 0) {
    return {
      stage: "result",
      nextStep: result.next_step,
      approvalLevel: result.approval_level,
      targetRenderer: result.provisional_renderer,
      result,
    };
  }

  if (result.next_step === "clarify_first") {
    return {
      stage: "clarify",
      nextStep: result.next_step,
      approvalLevel: result.approval_level,
      targetRenderer: result.provisional_renderer,
      result,
    };
  }

  if (result.next_step === "approval_pending") {
    return {
      stage: "approval",
      nextStep: result.next_step,
      approvalLevel: result.approval_level,
      targetRenderer: result.provisional_renderer,
      result,
    };
  }

  return {
    stage: "start",
    nextStep: result.next_step,
    approvalLevel: result.approval_level,
    targetRenderer: result.provisional_renderer,
    result,
  };
}
