import { NextResponse } from "next/server";
import { getProvider, PROVIDERS } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Stateless pass-through to a model vendor, used only when the browser cannot
 * call the vendor directly (CORS). It reads the key from the request, forwards
 * it once, and returns the vendor's response. Nothing is stored and nothing is
 * logged — the request body carries the user's API key and their draft email.
 *
 * The target URL is rebuilt from the provider registry rather than taken from
 * the request, so this cannot be pointed at an arbitrary host.
 */
export async function POST(request: Request) {
  let payload: {
    providerId?: string;
    model?: string;
    apiKey?: string;
    prompt?: { system?: string; user?: string };
  };

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Malformed request body" }, 400);
  }

  const { providerId, model, apiKey, prompt } = payload;

  if (!providerId || !PROVIDERS.some((p) => p.id === providerId)) {
    return json({ error: "Unknown provider" }, 400);
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return json({ error: "Missing API key" }, 400);
  }
  if (typeof model !== "string" || !model.trim()) {
    return json({ error: "Missing model" }, 400);
  }
  if (typeof prompt?.system !== "string" || typeof prompt?.user !== "string") {
    return json({ error: "Missing prompt" }, 400);
  }

  const provider = getProvider(providerId);
  const upstream = provider.buildRequest({
    apiKey,
    model,
    prompt: { system: prompt.system, user: prompt.user },
  });

  if (new URL(upstream.url).host !== provider.host) {
    return json({ error: "Refusing to relay off-provider" }, 400);
  }

  try {
    const response = await fetch(upstream.url, {
      method: upstream.method,
      headers: upstream.headers,
      body: upstream.body,
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });

    const text = await response.text();
    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: { message: text.slice(0, 300) } };
      }
    }

    return json({ upstreamStatus: response.status, payload: body }, 200);
  } catch {
    return json({ error: `Could not reach ${provider.label}` }, 502);
  }
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
      "referrer-policy": "no-referrer",
    },
  });
}
