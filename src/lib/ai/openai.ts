import { parseJsonResult } from "./gemini";
import type { GenerationResult, Provider } from "./types";

const HOST = "api.openai.com";

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * OpenAI Chat Completions. JSON mode keeps the response parseable. Note that
 * OpenAI does not always send permissive CORS for browser calls; when a direct
 * call is blocked the app falls through to the relay automatically.
 */
export const openai: Provider = {
  id: "openai",
  label: "OpenAI",
  host: HOST,
  defaultModel: "gpt-4o-mini",
  models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  keyUrl: "https://platform.openai.com/api-keys",
  keyHint: "Starts with sk-",

  buildRequest({ apiKey, model, prompt }) {
    return {
      url: `https://${HOST}/v1/chat/completions`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    };
  },

  parseResponse(payload): GenerationResult {
    const data = payload as ChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned an empty response");
    return parseJsonResult(text);
  },

  parseError(status, payload) {
    const message = (payload as { error?: { message?: string } })?.error?.message;
    if (status === 401) return "That OpenAI key was rejected. Check it in Settings.";
    if (status === 429) {
      return "Rate limited by OpenAI (or out of quota). Lower the concurrency or check billing.";
    }
    return message || `OpenAI request failed (HTTP ${status})`;
  },
};
