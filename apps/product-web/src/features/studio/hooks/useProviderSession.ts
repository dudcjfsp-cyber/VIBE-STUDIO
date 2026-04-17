import { useEffect, useMemo, useState } from "react";

import { listProviderModels } from "../../../lib/provider/providerRuntimeClient";
import type {
  ProviderId,
  ProviderModel,
  ProviderRuntimeConfig,
  ProviderSessionRecord,
} from "../../../lib/provider/types";

const SESSION_KEY = "vive-studio.provider-session.v1";
const SESSION_TTL_MS = 30 * 60 * 1000;

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
    apiKey: stored.apiKey,
    errorMessage: undefined,
    expiresAt: stored.expiresAt,
    isLoading: false,
    model: stored.model,
    models: stored.models,
    provider: stored.provider,
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

    try {
      const models = await listProviderModels(state.provider, apiKey);

      if (models.length === 0) {
        throw new Error("이 키로 사용할 수 있는 모델을 찾지 못했어요.");
      }

      const nextModel = models.some((model) => model.id === state.model)
        ? state.model
        : models[0]?.id ?? "";
      const expiresAt = Date.now() + SESSION_TTL_MS;
      const record: ProviderSessionRecord = {
        provider: state.provider,
        apiKey,
        model: nextModel,
        models,
        expiresAt,
      };

      writeStoredSession(record);
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
      setState((current) => ({
        ...current,
        errorMessage:
          error instanceof Error
            ? error.message
            : "모델 목록을 불러오는 중에 문제가 생겼어요.",
        isLoading: false,
      }));
    }
  }

  function clearSession() {
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
