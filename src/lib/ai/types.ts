import type { Tone } from "../types";

export interface PromptParts {
  system: string;
  user: string;
}

export interface GenerationResult {
  subject: string;
  body: string;
}

export interface GenerationInput {
  email: string;
  name: string;
  /** `low` means the name was guessed and may not be a real given name. */
  nameIsGuess: boolean;
  company: string;
  role: string;
  notes: string;
  tone: Tone;
  senderName: string;
  senderBackground: string;
  templateSubject: string;
  templateBody: string;
}

export interface ProviderRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Adding a provider means adding one of these — nothing else in the app knows
 * which model vendor is in use.
 */
export interface Provider {
  id: string;
  label: string;
  /** Host the relay route is allowed to reach for this provider. */
  host: string;
  defaultModel: string;
  models: readonly string[];
  keyUrl: string;
  keyHint: string;
  buildRequest(args: {
    apiKey: string;
    model: string;
    prompt: PromptParts;
  }): ProviderRequest;
  parseResponse(payload: unknown): GenerationResult;
  parseError(status: number, payload: unknown): string;
}
