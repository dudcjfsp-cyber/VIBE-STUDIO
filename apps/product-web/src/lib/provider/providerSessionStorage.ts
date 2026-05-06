import type { ProviderSessionRecord } from "./types";

const providerSessionStorageKey = "vive-studio.provider-session.v1";
const providerSessionTtlMs = 30 * 60 * 1000;

export function createProviderSessionExpiresAt(now = Date.now()): number {
  return now + providerSessionTtlMs;
}

export function readProviderSessionRecord(
  now = Date.now(),
): ProviderSessionRecord | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(providerSessionStorageKey);

    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as ProviderSessionRecord;

    if (!parsed.expiresAt || parsed.expiresAt <= now) {
      clearProviderSessionRecord();
      return undefined;
    }

    return parsed;
  } catch {
    clearProviderSessionRecord();
    return undefined;
  }
}

export function writeProviderSessionRecord(record: ProviderSessionRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    providerSessionStorageKey,
    JSON.stringify(record),
  );
}

export function clearProviderSessionRecord() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(providerSessionStorageKey);
}
