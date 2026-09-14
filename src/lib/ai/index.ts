import { gemini } from "./gemini";
import { buildPrompt } from "./prompt";
import type { GenerationInput, GenerationResult, Provider } from "./types";

export const PROVIDERS: readonly Provider[] = [gemini];

export function getProvider(id: string): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export const ALLOWED_HOSTS = new Set(PROVIDERS.map((p) => p.host));

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly corsBlocked = false,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 300) } };
  }
}

interface GenerateArgs {
  providerId: string;
  model: string;
  apiKey: string;
  transport: "direct" | "relay";
  input: GenerationInput;
  signal?: AbortSignal;
}

/**
 * `direct` talks to the model vendor from the browser, so the key and the
 * email never touch our server. `relay` exists only for vendors that refuse
 * cross-origin browser calls, and we fall back to it automatically when a
 * direct call is blocked rather than failing in a way nobody can diagnose.
 */
export async function generate({
  providerId,
  model,
  apiKey,
  transport,
  input,
  signal,
}: GenerateArgs): Promise<GenerationResult> {
  const provider = getProvider(providerId);
  const prompt = buildPrompt(input);
  const resolvedModel = model.trim() || provider.defaultModel;

  if (transport === "direct") {
    try {
      return await callDirect(provider, apiKey, resolvedModel, prompt, signal);
    } catch (error) {
      if (error instanceof GenerationError && error.corsBlocked) {
        return callRelay(provider, apiKey, resolvedModel, prompt, signal);
      }
      throw error;
    }
  }
  return callRelay(provider, apiKey, resolvedModel, prompt, signal);
}

async function callDirect(
  provider: Provider,
  apiKey: string,
  model: string,
  prompt: ReturnType<typeof buildPrompt>,
  signal?: AbortSignal,
): Promise<GenerationResult> {
  const request = provider.buildRequest({ apiKey, model, prompt });

  let response: Response;
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    // fetch only throws like this for network/CORS failures.
    throw new GenerationError(
      `Could not reach ${provider.label} from the browser.`,
      true,
    );
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw new GenerationError(provider.parseError(response.status, payload));
  }
  return provider.parseResponse(payload);
}

async function callRelay(
  provider: Provider,
  apiKey: string,
  model: string,
  prompt: ReturnType<typeof buildPrompt>,
  signal?: AbortSignal,
): Promise<GenerationResult> {
  const response = await fetch("/api/relay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ providerId: provider.id, model, apiKey, prompt }),
    signal,
  });

  const payload = (await readJson(response)) as {
    upstreamStatus?: number;
    payload?: unknown;
    error?: string;
  };

  if (!response.ok) {
    throw new GenerationError(payload.error || `Relay failed (HTTP ${response.status})`);
  }
  const status = payload.upstreamStatus ?? 200;
  if (status < 200 || status >= 300) {
    throw new GenerationError(provider.parseError(status, payload.payload));
  }
  return provider.parseResponse(payload.payload);
}

export type { GenerationInput, GenerationResult, Provider };
