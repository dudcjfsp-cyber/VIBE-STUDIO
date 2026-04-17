import { useMemo, useState } from "react";
import type { CardHint, EngineRequest, EngineResult } from "@vive-studio/engine-contracts";

import { runProductEngine } from "../../../lib/engine/productEngineClient";
import type { ProviderRuntimeConfig } from "../../../lib/provider/types";
import type { StageSnapshot } from "../types";

type SubmitOptions = {
  cardHint?: CardHint;
  text: string;
};

type UseStudioFlowOptions = {
  blockReason: string | undefined;
  runtime: ProviderRuntimeConfig | undefined;
};

export function useStudioFlow(options: UseStudioFlowOptions) {
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
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
    if (options.blockReason) {
      setErrorMessage(options.blockReason);
      return;
    }

    setErrorMessage(undefined);
    setIsBusy(true);

    try {
      const result = await runProductEngine(
        nextRequest,
        approval ? { approval } : undefined,
        options.runtime,
      );
      setSnapshot(mapResultToStage(result));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "요청을 처리하는 중에 문제가 생겼어요.",
      );
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
    setErrorMessage(undefined);
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
    errorMessage,
    input,
    isBusy,
    request,
    reset,
    selectedHint,
    setInput(value: string) {
      setErrorMessage(undefined);
      setInput(value);
    },
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
