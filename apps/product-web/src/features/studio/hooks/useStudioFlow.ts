import { useEffect, useMemo, useRef, useState } from "react";
import type { CardHint, EngineRequest, EngineResult } from "@vive-studio/engine-contracts";

import { runProductEngine } from "../../../lib/engine/productEngineClient";
import {
  createTelemetryRunId,
  ensureTelemetrySessionStarted,
  trackProductEvent,
} from "../../../lib/observability/browserTelemetry";
import type { ProviderRuntimeConfig } from "../../../lib/provider/types";
import { formatVisibleErrorMessage } from "../../../lib/ux/formatVisibleErrorMessage";
import type { StageSnapshot } from "../types";

type SubmitOptions = {
  appliedInputHint?: {
    baseText: string;
    text: string;
    title: string;
  };
  cardHint?: CardHint;
  sourceKind?: "example" | "free-input";
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
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<StageSnapshot>({
    stage: "start",
    nextStep: "direct_render",
    approvalLevel: "none",
  });
  const [isBusy, setIsBusy] = useState(false);
  const inFlightRef = useRef(false);
  const stageSignatureRef = useRef<string | undefined>();

  const canSubmit = input.trim().length > 0 && !isBusy;

  useEffect(() => {
    ensureTelemetrySessionStarted();
  }, []);

  useEffect(() => {
    const result = snapshot.result;

    if (!result) {
      return;
    }

    const signature = [
      snapshot.stage,
      snapshot.runId ?? "no-run",
      result.provisional_renderer,
      result.next_step,
      result.outputs.length,
    ].join(":");

    if (stageSignatureRef.current === signature) {
      return;
    }

    stageSignatureRef.current = signature;

    if (snapshot.stage === "result") {
      trackProductEvent("result_rendered", "result", {
        note_count: readPrimaryNoteCount(result),
        output_count: result.outputs.length,
        pivot_recommended: result.pivot_recommended,
        renderer: result.outputs[0]?.renderer ?? result.provisional_renderer,
        run_id: snapshot.runId,
      });
    }
  }, [snapshot]);

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

  async function advance(nextRequest: EngineRequest, runId?: string) {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;

    if (options.blockReason) {
      setErrorMessage(options.blockReason);
      inFlightRef.current = false;
      return;
    }

    setErrorMessage(undefined);
    setIsBusy(true);

    try {
      const result = await runProductEngine(
        nextRequest,
        { forceRender: true },
        options.runtime,
      );
      setSnapshot(mapResultToStage(result, runId));
    } catch (error) {
      trackProductEvent("api_request_failed", "error", {
        error_stage: "start",
        message_preview:
          error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
        run_id: runId,
      });
      setErrorMessage(
        formatVisibleErrorMessage(
          error,
          "요청을 처리하는 중에 문제가 생겼어요.",
        ),
      );
    } finally {
      inFlightRef.current = false;
      setIsBusy(false);
    }
  }

  async function submit(options?: SubmitOptions) {
    if (inFlightRef.current) {
      return;
    }

    const nextText = options?.text ?? input;
    const nextHint = options?.cardHint ?? selectedHint;
    const sourceKind = options?.sourceKind ?? "free-input";
    const nextRunId = createTelemetryRunId();
    const nextRequest: EngineRequest = {
      source: {
        ...(options?.appliedInputHint
          ? {
              metadata: {
                applied_input_hint_base_length:
                  options.appliedInputHint.baseText.trim().length,
                applied_input_hint_text: options.appliedInputHint.text.trim(),
                applied_input_hint_title: options.appliedInputHint.title.trim(),
              },
            }
          : {}),
        text: nextText.trim(),
      },
      ...(nextHint ? { card_hint: nextHint } : {}),
    };

    setInput(nextText);
    setSelectedHint(nextHint);
    setActiveRunId(nextRunId);

    trackProductEvent(
      sourceKind === "free-input" && snapshot.stage === "clarify"
        ? "clarify_submitted"
        : "input_submitted",
      snapshot.stage === "clarify"
        ? "clarify"
        : "start",
      {
        card_hint: nextHint,
        input_length: nextText.trim().length,
        run_id: nextRunId,
        source_kind: sourceKind,
      },
    );

    await advance(nextRequest, nextRunId);
  }

  function reset() {
    trackProductEvent("flow_reset_clicked", "start", {
      run_id: activeRunId,
    });
    setInput("");
    setErrorMessage(undefined);
    setActiveRunId(undefined);
    setSelectedHint(undefined);
    inFlightRef.current = false;
    setSnapshot({
      stage: "start",
      nextStep: "direct_render",
      approvalLevel: "none",
    });
  }

  return {
    canSubmit,
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

function mapResultToStage(result: EngineResult, runId?: string): StageSnapshot {
  if (result.outputs.length > 0) {
    return {
      stage: "result",
      nextStep: result.next_step,
      approvalLevel: result.approval_level,
      runId,
      targetRenderer: result.provisional_renderer,
      result,
    };
  }

  if (result.next_step === "clarify_first") {
    return {
      stage: "clarify",
      nextStep: result.next_step,
      approvalLevel: result.approval_level,
      runId,
      targetRenderer: result.provisional_renderer,
      result,
    };
  }

  if (result.next_step === "approval_pending") {
    return {
      stage: "approval",
      nextStep: result.next_step,
      approvalLevel: result.approval_level,
      runId,
      targetRenderer: result.provisional_renderer,
      result,
    };
  }

  return {
    stage: "start",
    nextStep: result.next_step,
    approvalLevel: result.approval_level,
    runId,
    targetRenderer: result.provisional_renderer,
    result,
  };
}

function readPrimaryNoteCount(result: EngineResult): number {
  const output = result.outputs[0]?.output;

  if (
    output &&
    typeof output === "object" &&
    "notes" in output &&
    Array.isArray((output as { notes?: unknown[] }).notes)
  ) {
    return (output as { notes: unknown[] }).notes.length;
  }

  return 0;
}
