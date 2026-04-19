import type {
  EngineRequest,
  RendererId,
  Stage1FollowUpRequest,
} from "@vive-studio/engine-contracts";

export type ProviderId = "local" | "openai" | "anthropic" | "gemini";

export type RemoteProviderId = Exclude<ProviderId, "local">;

export type ProviderModel = {
  id: string;
  label: string;
  description?: string;
};

export type ProviderRuntimeSession =
  | {
      provider: "local";
    }
  | {
      provider: RemoteProviderId;
      apiKey: string;
      model: string;
    };

export type ProductEngineRunOptions = {
  targets?: RendererId[];
  approval?: {
    recommended?: boolean;
    required?: boolean;
  };
};

export type ProductEngineRunPayload = {
  request: EngineRequest;
  options?: ProductEngineRunOptions;
  runtime?: ProviderRuntimeSession;
};

export type Stage1FollowUpPayload = {
  request: Stage1FollowUpRequest;
  runtime?: ProviderRuntimeSession;
};

export type ProviderModelsPayload = {
  provider: RemoteProviderId;
  apiKey: string;
};
