import type { GenerationResult, Provider } from "./types";

const HOST = "generativelanguage.googleapis.com";

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

export const gemini: Provider = {
  id: "gemini",
  label: "Google Gemini",
  host: HOST,
  defaultModel: "gemini-2.5-flash",
  models: [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
  ],
  keyUrl: "https://aistudio.google.com/apikey",
  keyHint: "Starts with AIza",

  buildRequest({ apiKey, model, prompt }) {
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: "user", parts: [{ text: prompt.user }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING" },
            body: { type: "STRING" },
          },
          required: ["subject", "body"],
        },
      },
    };

    // Flash does not need to think about a rewrite, and it halves the latency.
    if (/^gemini-2\.5-flash/.test(model)) {
      (body.generationConfig as Record<string, unknown>).thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    return {
      url: `https://${HOST}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    };
  },

  parseResponse(payload): GenerationResult {
    const data = payload as GeminiResponse;
    const blocked = data.promptFeedback?.blockReason;
    if (blocked) throw new Error(`Gemini blocked the prompt (${blocked})`);

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      const reason = candidate?.finishReason;
      throw new Error(
        reason && reason !== "STOP"
          ? `Gemini returned no text (${reason})`
          : "Gemini returned an empty response",
      );
    }
    return parseJsonResult(text);
  },

  parseError(status, payload) {
    const message = (payload as { error?: { message?: string } })?.error?.message;
    if (status === 400 && message?.includes("API key not valid")) {
      return "That API key was rejected. Check it in Settings.";
    }
    if (status === 429) {
      return "Rate limited by Gemini. Lower the concurrency in Settings or retry shortly.";
    }
    return message || `Gemini request failed (HTTP ${status})`;
  },
};

/** Models occasionally wrap JSON in a fence even when asked not to. */
export function parseJsonResult(text: string): GenerationResult {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("Model did not return JSON");
    }
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("Model did not return valid JSON");
    }
  }

  const record = parsed as { subject?: unknown; body?: unknown };
  const subject = typeof record.subject === "string" ? record.subject.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";
  if (!body) throw new Error("Model returned an empty email body");

  return { subject, body };
}
