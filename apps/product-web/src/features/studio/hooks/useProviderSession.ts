import { useEffect, useMemo, useState } from "react";

import { trackProductEvent } from "../../../lib/observability/browserTelemetry";
import { listProviderModels } from "../../../lib/provider/providerRuntimeClient";
import type {
  ProviderId,
  ProviderModel,
  ProviderRuntimeConfig,
  ProviderSessionRecord,
} from "../../../lib/provider/types";
import {
  enabledProviders,
  isProviderEnabled,
} from "../../../lib/runtime/productRuntimeConfig";
import { formatVisibleErrorMessage } from "../../../lib/ux/formatVisibleErrorMessage";

const SESSION_KEY = "vive-studio.provider-session.v1";
const SESSION_TTL_MS = 30 * 60 * 1000;
const preferredDefaultModels: Partial<Record<ProviderId, string[]>> = {
  openai: ["gpt-5-nano", "gpt5-nano"],
  gemini: ["gemini-2.5-flash"],
};

type ProviderSessionState = {
  apiKey: string;
  errorMessage: string | undefined;
  expiresAt: number | undefined;
  isLoading: boolean;
  model: string;
  models: ProviderModel[];
  provider: ProviderId;
};

function createInitialState(): ProviderSessionState {
  if (typeof window === "undefined") {
    return {
      apiKey: "",
      errorMessage: undefined,
      expiresAt: undefined,
      isLoading: false,
      model: "",
      models: [],
      provider: "local",
    };
  }

  const stored = readStoredSession();

  if (!stored) {
    return {
      apiKey: "",
      errorMessage: undefined,
      expiresAt: undefined,
      isLoading: false,
      model: "",
      models: [],
      provider: "local",
    };
  }

  return {
    apiKey: isProviderEnabled(stored.provider) ? stored.apiKey : "",
    errorMessage: undefined,
    expiresAt: isProviderEnabled(stored.provider) ? stored.expiresAt : undefined,
    isLoading: false,
    model: isProviderEnabled(stored.provider) ? stored.model : "",
    models: isProviderEnabled(stored.provider) ? stored.models : [],
    provider: isProviderEnabled(stored.provider) ? stored.provider : "local",
  };
}

export function useProviderSession() {
  const [state, setState] = useState<ProviderSessionState>(createInitialState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.expiresAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.expiresAt]);

  useEffect(() => {
    if (!state.expiresAt || state.expiresAt > now) {
      return;
    }

    trackProductEvent("provider_session_expired", "provider-session", {
      has_active_session: false,
      model: state.model || undefined,
      provider: state.provider,
    });
    clearStoredSession();
    setState((current) => ({
      apiKey: "",
      errorMessage:
        current.provider === "local"
          ? current.errorMessage
          : "30분 세션이 만료되어 키와 모델 정보를 지웠어요.",
      isLoading: false,
      model: "",
      models: [],
      provider: current.provider,
      expiresAt: undefined,
    }));
  }, [now, state.expiresAt]);

  const runtime = useMemo<ProviderRuntimeConfig | undefined>(() => {
    if (state.provider === "local") {
      return {
        provider: "local",
      };
    }

    if (!state.expiresAt || state.expiresAt <= now) {
      return undefined;
    }

    if (!state.apiKey.trim() || !state.model.trim()) {
      return undefined;
    }

    return {
      provider: state.provider,
      apiKey: state.apiKey.trim(),
      model: state.model.trim(),
    };
  }, [now, state.apiKey, state.expiresAt, state.model, state.provider]);

  const blockReason =
    state.provider !== "local" && !runtime
      ? "API 키를 연결하고 모델을 선택한 뒤에 실행할 수 있어요."
      : undefined;

  const sessionLabel = useMemo(() => {
    if (!state.expiresAt || state.expiresAt <= now) {
      return undefined;
    }

    const remainingMs = state.expiresAt - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return `세션 ${remainingMinutes}분 남음`;
  }, [now, state.expiresAt]);

  async function connect() {
    if (state.provider === "local") {
      setState((current) => ({
        ...current,
        apiKey: "",
        errorMessage: undefined,
        expiresAt: undefined,
        isLoading: false,
        model: "",
        models: [],
      }));
      clearStoredSession();
      return;
    }

    const apiKey = state.apiKey.trim();

    if (!apiKey) {
      setState((current) => ({
        ...current,
        errorMessage: "API 키를 먼저 입력해 주세요.",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      errorMessage: undefined,
      isLoading: true,
    }));
    trackProductEvent("provider_session_connect_started", "provider-session", {
      provider: state.provider,
    });

    try {
      const models = await listProviderModels(state.provider, apiKey);

      if (models.length === 0) {
        throw new Error("이 키로 사용할 수 있는 모델을 찾지 못했어요.");
      }

      const nextModel = selectDefaultModel(state.provider, models);
      const expiresAt = Date.now() + SESSION_TTL_MS;
      const record: ProviderSessionRecord = {
        provider: state.provider,
        apiKey,
        model: nextModel,
        models,
        expiresAt,
      };

      writeStoredSession(record);
      trackProductEvent("provider_session_connected", "provider-session", {
        has_active_session: true,
        model: nextModel,
        provider: state.provider,
      });
      setState({
        apiKey,
        errorMessage: undefined,
        expiresAt,
        isLoading: false,
        model: nextModel,
        models,
        provider: state.provider,
      });
    } catch (error) {
      trackProductEvent("provider_session_connect_failed", "provider-session", {
        error_type: "provider-connect-failed",
        message_preview:
          error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
        provider: state.provider,
      });
      setState((current) => ({
        ...current,
        errorMessage: formatVisibleErrorMessage(
          error,
          "모델 목록을 불러오는 중에 문제가 생겼어요.",
        ),
        isLoading: false,
      }));
    }
  }

  function clearSession() {
    trackProductEvent("provider_session_cleared", "provider-session", {
      has_active_session: false,
      model: state.model || undefined,
      provider: state.provider,
    });
    clearStoredSession();
    setState((current) => ({
      apiKey: "",
      errorMessage: undefined,
      expiresAt: undefined,
      isLoading: false,
      model: "",
      models: [],
      provider: current.provider,
    }));
  }

  function setApiKey(apiKey: string) {
    setState((current) => ({
      ...current,
      apiKey,
      errorMessage: undefined,
      expiresAt: current.provider === "local" ? undefined : current.expiresAt,
      model:
        current.provider === "local" || apiKey === current.apiKey ? current.model : "",
      models:
        current.provider === "local" || apiKey === current.apiKey ? current.models : [],
    }));

    if (state.provider !== "local") {
      clearStoredSession();
    }
  }

  function setModel(model: string) {
    trackProductEvent("provider_model_changed", "provider-session", {
      has_active_session: Boolean(state.expiresAt && state.expiresAt > Date.now()),
      model,
      provider: state.provider,
    });
    setState((current) => {
      const nextState = {
        ...current,
        errorMessage: undefined,
        model,
      };

      if (
        current.provider !== "local" &&
        current.expiresAt &&
        current.expiresAt > Date.now()
      ) {
        writeStoredSession({
          provider: current.provider,
          apiKey: current.apiKey,
          model,
          models: current.models,
          expiresAt: current.expiresAt,
        });
      }

      return nextState;
    });
  }

  function setProvider(provider: ProviderId) {
    if (!isProviderEnabled(provider)) {
      return;
    }

    if (provider === "local") {
      clearStoredSession();
      setState({
        apiKey: "",
        errorMessage: undefined,
        expiresAt: undefined,
        isLoading: false,
        model: "",
        models: [],
        provider,
      });
      return;
    }

    const stored = readStoredSession();

    if (stored?.provider === provider) {
      setState({
        apiKey: stored.apiKey,
        errorMessage: undefined,
        expiresAt: stored.expiresAt,
        isLoading: false,
        model: stored.model,
        models: stored.models,
        provider,
      });
      return;
    }

    setState({
      apiKey: "",
      errorMessage: undefined,
      expiresAt: undefined,
      isLoading: false,
      model: "",
      models: [],
      provider,
    });
  }

  return {
    availableProviders: enabledProviders,
    blockReason,
    clearSession,
    connect,
    errorMessage: state.errorMessage,
    hasActiveSession: Boolean(runtime && runtime.provider !== "local"),
    isLoading: state.isLoading,
    model: state.model,
    models: state.models,
    provider: state.provider,
    runtime,
    sessionLabel,
    setApiKey,
    setModel,
    setProvider,
    apiKey: state.apiKey,
  };
}

function readStoredSession(): ProviderSessionRecord | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);

    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as ProviderSessionRecord;

    if (!parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      clearStoredSession();
      return undefined;
    }

    return parsed;
  } catch {
    clearStoredSession();
    return undefined;
  }
}

function writeStoredSession(record: ProviderSessionRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SESSION_KEY);
}

function selectDefaultModel(provider: ProviderId, models: ProviderModel[]): string {
  const preferredIds = preferredDefaultModels[provider] ?? [];
  const exactMatch = preferredIds
    .map((preferredId) =>
      models.find((model) => normalizeModelId(model.id) === normalizeModelId(preferredId)),
    )
    .find((model): model is ProviderModel => Boolean(model));

  if (exactMatch) {
    return exactMatch.id;
  }

  if (provider === "gemini") {
    const flashMatch = models.find((model) => {
      const searchableText = normalizeModelId(`${model.id} ${model.label}`);

      return searchableText.includes("gemini-2.5-flash");
    });

    if (flashMatch) {
      return flashMatch.id;
    }
  }

  return models[0]?.id ?? "";
}

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase().replace(/^models\//, "");
}
