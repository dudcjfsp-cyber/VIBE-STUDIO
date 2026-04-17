export type ProviderId = "local" | "openai" | "anthropic" | "gemini";

export type RemoteProviderId = Exclude<ProviderId, "local">;

export type ProviderModel = {
  id: string;
  label: string;
  description?: string;
};

export type ProviderRuntimeConfig =
  | {
      provider: "local";
    }
  | {
      provider: RemoteProviderId;
      apiKey: string;
      model: string;
    };

export type ProviderSessionRecord = {
  provider: RemoteProviderId;
  apiKey: string;
  model: string;
  models: ProviderModel[];
  expiresAt: number;
};

export const providerOptions: Array<{
  id: ProviderId;
  label: string;
}> = [
  {
    id: "local",
    label: "로컬 미리보기",
  },
  {
    id: "openai",
    label: "OpenAI",
  },
  {
    id: "anthropic",
    label: "Anthropic",
  },
  {
    id: "gemini",
    label: "Gemini",
  },
];
