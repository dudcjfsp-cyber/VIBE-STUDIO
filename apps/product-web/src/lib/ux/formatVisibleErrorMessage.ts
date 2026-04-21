export function formatVisibleErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const rawMessage = readErrorMessage(error);

  if (!rawMessage) {
    return fallbackMessage;
  }

  if (/[가-힣]/u.test(rawMessage)) {
    return rawMessage;
  }

  return translateProviderError(rawMessage) ?? fallbackMessage;
}

function readErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return undefined;
}

function translateProviderError(message: string): string | undefined {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("high demand") ||
    normalized.includes("spikes in demand") ||
    normalized.includes("overloaded") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("try again later")
  ) {
    return "현재 선택한 모델 요청이 많아 일시적으로 응답이 어렵습니다. 보통 잠시 뒤 해소되니 조금 후 다시 시도해 주세요.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  ) {
    return "요청이 짧은 시간에 너무 많이 들어갔습니다. 잠시 기다린 뒤 다시 시도해 주세요.";
  }

  if (
    normalized.includes("quota") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("billing") ||
    normalized.includes("exceeded your current")
  ) {
    return "API 사용량 한도나 결제 설정 때문에 요청을 처리하지 못했습니다. 제공자 콘솔에서 사용량과 결제 상태를 확인해 주세요.";
  }

  if (
    normalized.includes("api key") ||
    normalized.includes("apikey") ||
    normalized.includes("unauthorized") ||
    normalized.includes("authentication") ||
    normalized.includes("permission denied") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("401") ||
    normalized.includes("403")
  ) {
    return "API 키가 유효하지 않거나 이 모델을 사용할 권한이 없습니다. 키와 모델 권한을 확인해 주세요.";
  }

  if (
    normalized.includes("model not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("not supported") ||
    normalized.includes("unsupported model")
  ) {
    return "선택한 모델을 사용할 수 없습니다. 모델 목록을 다시 불러온 뒤 다른 모델을 선택해 주세요.";
  }

  if (
    normalized.includes("structured json") ||
    normalized.includes("valid json") ||
    normalized.includes("json output") ||
    normalized.includes("schema")
  ) {
    return "모델 응답을 앱이 읽을 수 있는 구조로 받지 못했습니다. 같은 요청을 다시 시도해 주세요.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("timeout") ||
    normalized.includes("connection")
  ) {
    return "네트워크 연결이나 API 서버 응답이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.";
  }

  if (
    normalized.includes("openai request failed") ||
    normalized.includes("gemini request failed") ||
    normalized.includes("model list request failed")
  ) {
    return "모델 제공자 요청 중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.";
  }

  return undefined;
}
