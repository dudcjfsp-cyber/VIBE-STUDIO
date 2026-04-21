const fallbackApiBaseUrl = "http://127.0.0.1:4177/api";
const defaultProviderList = "local,openai,anthropic,gemini";

import type { ProviderId } from "../provider/types";

export const productApiBaseUrl = normalizeApiBaseUrl(
  import.meta.env.VITE_PRODUCT_API_URL as string | undefined,
);

export const productBasePath = normalizeBasePath(
  import.meta.env.VITE_PRODUCT_BASE_PATH as string | undefined,
);

export const productEngineMode =
  (import.meta.env.VITE_PRODUCT_ENGINE_MODE as string | undefined)?.trim() ||
  "auto";

export const enabledProviders = readEnabledProviders(
  import.meta.env.VITE_AVAILABLE_PROVIDERS as string | undefined,
);

function normalizeApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallbackApiBaseUrl;
  }

  return trimmed.replace(/\/+$/, "");
}

function normalizeBasePath(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withTrailingSlash = withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;

  return withTrailingSlash.replace(/\/{2,}/g, "/");
}

function readEnabledProviders(value: string | undefined): ProviderId[] {
  const ids = (value?.trim() || defaultProviderList)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is ProviderId =>
      entry === "local" ||
      entry === "openai" ||
      entry === "anthropic" ||
      entry === "gemini",
    );

  return ids.length > 0 ? ids : ["local"];
}

export function isProviderEnabled(provider: ProviderId): boolean {
  return enabledProviders.includes(provider);
}
