import { createServer } from "node:http";

import { createRuntimeEngine } from "./create-runtime-engine.js";
import { emitRuntimeEvent, readMessagePreview } from "./observability.js";
import { listProviderModels } from "./provider-runtime.js";
import { runStage1FollowUp } from "./run-stage1-follow-up.js";
import type {
  ProductEngineRunPayload,
  ProviderModelsPayload,
  ProviderRuntimeSession,
  Stage1FollowUpPayload,
} from "./types.js";

const host = process.env.HOST?.trim() || "0.0.0.0";
const port = Number(process.env.PORT ?? 4177);
const allowedOrigins = readAllowedOrigins(process.env.VIBE_ALLOWED_ORIGINS);

const server = createServer(async (request, response) => {
  const corsStatus = setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(corsStatus === "blocked" ? 403 : 204);
    response.end();
    return;
  }

  if (corsStatus === "blocked") {
    sendJson(response, 403, {
      error: "Origin is not allowed.",
    });
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      supported_providers: ["local", "openai", "anthropic", "gemini"],
      session_ttl_minutes: 30,
      credentials_persisted: false,
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/providers/models") {
    const startedAt = Date.now();
    try {
      const payload = (await readJson(request)) as ProviderModelsPayload;

      if (!payload.provider || !payload.apiKey?.trim()) {
        sendJson(response, 400, {
          error: "Provider and API key are required.",
        });
        return;
      }

      const models = await listProviderModels(payload.provider, payload.apiKey.trim());
      sendJson(response, 200, {
        provider: payload.provider,
        models,
      });
    } catch (error) {
      emitRuntimeEvent("provider_request_failed", "error", {
        duration_ms: Date.now() - startedAt,
        error_stage: "providers-models",
        message_preview: readMessagePreview(error),
      });
      sendJson(response, 500, {
        error: readErrorMessage(error),
      });
    }

    return;
  }

  if (request.method === "POST" && request.url === "/api/analyze") {
    const startedAt = Date.now();
    try {
      const payload = (await readJson(request)) as { request?: ProductEngineRunPayload["request"] };

      if (!payload.request) {
        sendJson(response, 400, {
          error: "Request body must include a request field.",
        });
        return;
      }

      emitRuntimeEvent("analyze_request_started", "runtime", {
        input_length: payload.request.source.text.trim().length,
      });
      const engine = createRuntimeEngine({
        provider: "local",
      });
      const result = engine.analyze(payload.request);
      emitRuntimeEvent("analyze_request_completed", "runtime", {
        duration_ms: Date.now() - startedAt,
        next_step: result.next_step,
        renderer: result.provisional_renderer,
        response_status: 200,
      });
      sendJson(response, 200, result);
    } catch (error) {
      emitRuntimeEvent("api_request_failed", "error", {
        duration_ms: Date.now() - startedAt,
        error_stage: "analyze",
        message_preview: readMessagePreview(error),
      });
      sendJson(response, 500, {
        error: readErrorMessage(error),
      });
    }

    return;
  }

  if (request.method === "POST" && request.url === "/api/run") {
    const startedAt = Date.now();
    try {
      const payload = (await readJson(request)) as ProductEngineRunPayload;

      if (!payload.request) {
        sendJson(response, 400, {
          error: "Request body must include a request field.",
        });
        return;
      }

      const runtime = normalizeRuntime(payload.runtime);
      emitRuntimeEvent("run_request_started", "runtime", {
        input_length: payload.request.source.text.trim().length,
        model: runtime?.provider === "local" ? undefined : runtime?.model,
        provider: runtime?.provider ?? "local",
      });
      const engine = createRuntimeEngine(runtime);
      const result = await engine.run(payload.request, payload.options ?? {});
      emitRuntimeEvent("run_request_completed", "runtime", {
        approval_level: result.approval_level,
        duration_ms: Date.now() - startedAt,
        model: runtime?.provider === "local" ? undefined : runtime?.model,
        next_step: result.next_step,
        provider: runtime?.provider ?? "local",
        renderer: result.outputs[0]?.renderer ?? result.provisional_renderer,
        response_status: 200,
      });
      sendJson(response, 200, result);
    } catch (error) {
      emitRuntimeEvent("api_request_failed", "error", {
        duration_ms: Date.now() - startedAt,
        error_stage: "run",
        message_preview: readMessagePreview(error),
      });
      sendJson(response, 500, {
        error: readErrorMessage(error),
      });
    }

    return;
  }

  if (request.method === "POST" && request.url === "/api/follow-up") {
    const startedAt = Date.now();
    try {
      const payload = (await readJson(request)) as Stage1FollowUpPayload;

      if (!payload.request) {
        sendJson(response, 400, {
          error: "Request body must include a request field.",
        });
        return;
      }

      const runtime = normalizeRuntime(payload.runtime);
      emitRuntimeEvent("followup_runtime_started", "runtime", {
        action_id: payload.request.selected_action,
        model: runtime?.provider === "local" ? undefined : runtime?.model,
        provider: runtime?.provider ?? "local",
        renderer: payload.request.renderer,
      });
      const result = await runStage1FollowUp(payload.request, runtime);
      emitRuntimeEvent("followup_runtime_completed", "runtime", {
        action_id: payload.request.selected_action,
        duration_ms: Date.now() - startedAt,
        model: runtime?.provider === "local" ? undefined : runtime?.model,
        provider: runtime?.provider ?? "local",
        response_status: 200,
        result_kind: result.result_kind,
      });
      sendJson(response, 200, result);
    } catch (error) {
      emitRuntimeEvent("api_request_failed", "error", {
        duration_ms: Date.now() - startedAt,
        error_stage: "follow-up",
        message_preview: readMessagePreview(error),
      });
      sendJson(response, 500, {
        error: readErrorMessage(error),
      });
    }

    return;
  }

  sendJson(response, 404, {
    error: "Not Found",
  });
});

server.listen(port, host, () => {
  console.log(`Product server available at http://${host}:${port}/api/health`);
  console.log(
    allowedOrigins.size > 0
      ? `CORS allowlist active for ${allowedOrigins.size} origin(s).`
      : "CORS allowlist not set. Allowing all origins.",
  );
  console.log("Credential mode: browser session -> per-request runtime forwarding");
});

function normalizeRuntime(
  runtime: ProductEngineRunPayload["runtime"],
): ProviderRuntimeSession | undefined {
  if (!runtime || runtime.provider === "local") {
    return {
      provider: "local",
    };
  }

  if (!runtime.apiKey?.trim() || !runtime.model?.trim()) {
    throw new Error("Remote provider requests must include apiKey and model.");
  }

  return {
    provider: runtime.provider,
    apiKey: runtime.apiKey.trim(),
    model: runtime.model.trim(),
  };
}

function setCorsHeaders(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
): "allowed" | "blocked" {
  const requestOrigin = readRequestOrigin(request);
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);

  if (allowedOrigin) {
    response.setHeader("access-control-allow-origin", allowedOrigin);
  }

  response.setHeader("vary", "Origin");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");

  if (requestOrigin && !allowedOrigin) {
    return "blocked";
  }

  return "allowed";
}

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(
  request: import("node:http").IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown server error.";
}

function readAllowedOrigins(value: string | undefined): Set<string> {
  const origins = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return new Set(origins);
}

function readRequestOrigin(
  request: import("node:http").IncomingMessage,
): string | undefined {
  const originHeader = request.headers?.origin;

  if (Array.isArray(originHeader)) {
    return originHeader[0]?.trim();
  }

  return originHeader?.trim();
}

function resolveAllowedOrigin(origin: string | undefined): string | undefined {
  if (allowedOrigins.size === 0) {
    return "*";
  }

  if (!origin) {
    return undefined;
  }

  return allowedOrigins.has(origin) ? origin : undefined;
}
