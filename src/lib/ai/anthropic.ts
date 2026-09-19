import { parseJsonResult } from "./gemini";
import type { GenerationResult, Provider } from "./types";

const HOST = "api.anthropic.com";

interface MessagesResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
}

/**
 * Anthropic Messages API, called straight from the browser. That needs the
 * `anthropic-dangerous-direct-browser-access` header — without it the API
 * refuses cross-origin requests. The key still only lives in the user's
 * browser, which is this app's whole model.
 */
export const anthropic: Provider = {
  id: "anthropic",
  label: "Anthropic Claude",
  host: HOST,
  defaultModel: "claude-sonnet-5",
  models: ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5"],
  keyUrl: "https://console.anthropic.com/settings/keys",
  keyHint: "Starts with sk-ant-",

  buildRequest({ apiKey, model, prompt }) {
    return {
      url: `https://${HOST}/v1/messages`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        // The prompt already asks for two JSON fields; a system instruction to
        // return only JSON keeps Claude from adding a preamble.
        system: `${prompt.system}\n\nReturn only the JSON object, with no text before or after it.`,
        messages: [{ role: "user", content: prompt.user }],
      }),
    };
  },

  parseResponse(payload): GenerationResult {
    const data = payload as MessagesResponse;
    const text = (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Claude returned an empty response");
    return parseJsonResult(text);
  },

  parseError(status, payload) {
    const message = (payload as { error?: { message?: string } })?.error?.message;
    if (status === 401) return "That Anthropic key was rejected. Check it in Settings.";
    if (status === 429) {
      return "Rate limited by Anthropic. Lower the concurrency in Settings or retry shortly.";
    }
    return message || `Anthropic request failed (HTTP ${status})`;
  },
};
