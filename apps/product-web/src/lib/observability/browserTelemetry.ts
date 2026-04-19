type TelemetryValue = boolean | number | string | null | undefined;

type TelemetryPayload = Record<string, TelemetryValue>;

export type ProductWebTelemetryStage =
  | "start"
  | "clarify"
  | "approval"
  | "result"
  | "followup"
  | "provider-session"
  | "error";

export type ProductWebTelemetryEventName =
  | "session_started"
  | "input_submitted"
  | "flow_reset_clicked"
  | "clarify_shown"
  | "clarify_submitted"
  | "approval_shown"
  | "approval_continue_clicked"
  | "approval_revise_clicked"
  | "approval_revise_mode_opened"
  | "approval_revise_resubmitted"
  | "result_rendered"
  | "result_restart_clicked"
  | "prompt_help_learning_panel_shown"
  | "prompt_help_copy_clicked"
  | "followup_action_clicked"
  | "followup_request_started"
  | "followup_request_completed"
  | "followup_request_failed"
  | "review_refinement_started"
  | "review_refinement_completed"
  | "review_refinement_failed"
  | "provider_session_connect_started"
  | "provider_session_connected"
  | "provider_session_connect_failed"
  | "provider_session_cleared"
  | "provider_session_expired"
  | "provider_model_changed"
  | "api_request_failed";

export type ProductWebTelemetryEvent = {
  created_at: string;
  event_name: ProductWebTelemetryEventName;
  session_id: string;
  stage: ProductWebTelemetryStage;
  surface: "product-web";
} & TelemetryPayload;

const SESSION_KEY = "vive-studio.observability-session.v1";
const DEBUG_MODE =
  (import.meta.env.VITE_OBSERVABILITY_DEBUG as string | undefined)?.trim() === "1";

let sessionStartedEmitted = false;

declare global {
  interface Window {
    __VIBE_STUDIO_TELEMETRY_QUEUE__?: ProductWebTelemetryEvent[];
  }
}

export function ensureTelemetrySessionStarted() {
  if (typeof window === "undefined" || sessionStartedEmitted) {
    return;
  }

  sessionStartedEmitted = true;
  trackProductEvent("session_started", "start");
}

export function createTelemetryRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function trackProductEvent(
  eventName: ProductWebTelemetryEventName,
  stage: ProductWebTelemetryStage,
  payload: TelemetryPayload = {},
): ProductWebTelemetryEvent | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const event: ProductWebTelemetryEvent = {
    created_at: new Date().toISOString(),
    event_name: eventName,
    session_id: getOrCreateSessionId(),
    stage,
    surface: "product-web",
    ...stripUndefined(payload),
  };

  if (!window.__VIBE_STUDIO_TELEMETRY_QUEUE__) {
    window.__VIBE_STUDIO_TELEMETRY_QUEUE__ = [];
  }

  window.__VIBE_STUDIO_TELEMETRY_QUEUE__.push(event);

  if (DEBUG_MODE) {
    console.debug("[vibe-studio telemetry]", event);
  }

  return event;
}

function getOrCreateSessionId(): string {
  const existing = window.sessionStorage.getItem(SESSION_KEY)?.trim();

  if (existing) {
    return existing;
  }

  const nextId = createTelemetryRunId();
  window.sessionStorage.setItem(SESSION_KEY, nextId);

  return nextId;
}

function stripUndefined(payload: TelemetryPayload): TelemetryPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}
