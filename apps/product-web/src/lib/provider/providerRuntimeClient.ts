import type {
  ProviderModel,
  ProviderRuntimeConfig,
  RemoteProviderId,
} from "./types";

type ProductEngineRunOptions = {
  targets?: import("@vive-studio/engine-contracts").RendererId[];
  approval?: {
    recommended?: boolean;
    required?: boolean;
  };
};

const apiBaseUrl =
  (import.meta.env.VITE_PRODUCT_API_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:4177/api";

export async function listProviderModels(
  provider: RemoteProviderId,
  apiKey: string,
): Promise<ProviderModel[]> {
  const response = await postJson<{ models: ProviderModel[] }>(
    `${apiBaseUrl}/providers/models`,
    {
      provider,
      apiKey,
    },
  );

  return response.models;
}

export async function runRemoteProductEngine(
  request: import("@vive-studio/engine-contracts").EngineRequest,
  options: ProductEngineRunOptions,
  runtime: ProviderRuntimeConfig | undefined,
): Promise<import("@vive-studio/engine-contracts").EngineResult> {
  return postJson(`${apiBaseUrl}/run`, {
    request,
    ...(hasRunOptions(options) ? { options } : {}),
    ...(runtime ? { runtime } : {}),
  });
}

function hasRunOptions(options: ProductEngineRunOptions): boolean {
  return Boolean(options.approval) || Boolean(options.targets?.length);
}

async function postJson<T>(url: string, payload: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    return `Product runtime request failed with status ${response.status}.`;
  }

  return `Product runtime request failed with status ${response.status}.`;
}
