type RuntimeTelemetryStage = "runtime" | "error";

type RuntimeTelemetryEventName =
  | "analyze_request_started"
  | "analyze_request_completed"
  | "run_request_started"
  | "run_request_completed"
  | "followup_runtime_started"
  | "followup_runtime_completed"
  | "api_request_failed"
  | "provider_request_failed";

type RuntimeTelemetryPayload = Record<
  string,
  boolean | number | string | null | undefined
>;

const DEBUG_MODE = process.env.VIBE_OBSERVABILITY_DEBUG === "1";

export function emitRuntimeEvent(
  eventName: RuntimeTelemetryEventName,
  stage: RuntimeTelemetryStage,
  payload: RuntimeTelemetryPayload = {},
) {
  if (!DEBUG_MODE) {
    return;
  }

  console.debug("[vibe-studio runtime telemetry]", {
    created_at: new Date().toISOString(),
    event_name: eventName,
    stage,
    surface: "product-server",
    ...stripUndefined(payload),
  });
}

export function readMessagePreview(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 180);
  }

  return "Unknown server error.";
}

function stripUndefined(payload: RuntimeTelemetryPayload): RuntimeTelemetryPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}
