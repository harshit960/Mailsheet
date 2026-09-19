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
    /**
     * Whether waiting and asking again could plausibly succeed. A rate limit
     * or a vendor outage clears on its own; a rejected key or a malformed
     * request never does, and retrying it just wastes the user's afternoon.
     */
    readonly retryable = false,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

/** Three tries after the first, five minutes apart. */
export const RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 5 * 60_000;

/** 429 means slow down; 5xx means the vendor is unwell. Both pass. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || (status >= 500 && status < 600);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error("Aborted"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("Aborted"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
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

export interface RetryNotice {
  /** 1-based: the retry about to be waited out, not the attempt that failed. */
  attempt: number;
  of: number;
  waitMs: number;
  reason: string;
}

interface GenerateArgs {
  providerId: string;
  model: string;
  apiKey: string;
  transport: "direct" | "relay";
  input: GenerationInput;
  signal?: AbortSignal;
  /** Called before each wait, so the UI can show why nothing is happening. */
  onRetry?: (notice: RetryNotice) => void;
  retryAttempts?: number;
  retryDelayMs?: number;
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
  onRetry,
  retryAttempts = RETRY_ATTEMPTS,
  retryDelayMs = RETRY_DELAY_MS,
}: GenerateArgs): Promise<GenerationResult> {
  const provider = getProvider(providerId);
  const prompt = buildPrompt(input);
  const resolvedModel = model.trim() || provider.defaultModel;

  const attempt = () => attemptOnce(provider, apiKey, resolvedModel, prompt, transport, signal);

  for (let retry = 0; ; retry++) {
    try {
      return await attempt();
    } catch (error) {
      if (signal?.aborted) throw error;

      const retryable = error instanceof GenerationError && error.retryable;
      if (!retryable || retry >= retryAttempts) throw error;

      onRetry?.({
        attempt: retry + 1,
        of: retryAttempts,
        waitMs: retryDelayMs,
        reason: error instanceof Error ? error.message : "Request failed",
      });

      // Rejects if the run is stopped, so a five-minute wait stays cancellable.
      await sleep(retryDelayMs, signal);
    }
  }
}

async function attemptOnce(
  provider: Provider,
  apiKey: string,
  model: string,
  prompt: ReturnType<typeof buildPrompt>,
  transport: "direct" | "relay",
  signal?: AbortSignal,
): Promise<GenerationResult> {
  if (transport === "direct") {
    try {
      return await callDirect(provider, apiKey, model, prompt, signal);
    } catch (error) {
      // A browser that cannot reach the vendor at all is not a transient
      // failure to sit out — go through our own origin instead.
      if (error instanceof GenerationError && error.corsBlocked) {
        return callRelay(provider, apiKey, model, prompt, signal);
      }
      throw error;
    }
  }
  return callRelay(provider, apiKey, model, prompt, signal);
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
    throw new GenerationError(
      provider.parseError(response.status, payload),
      false,
      isRetryableStatus(response.status),
    );
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
    throw new GenerationError(
      payload.error || `Relay failed (HTTP ${response.status})`,
      false,
      isRetryableStatus(response.status),
    );
  }
  const status = payload.upstreamStatus ?? 200;
  if (status < 200 || status >= 300) {
    throw new GenerationError(
      provider.parseError(status, payload.payload),
      false,
      isRetryableStatus(status),
    );
  }
  return provider.parseResponse(payload.payload);
}

export type { GenerationInput, GenerationResult, Provider };
