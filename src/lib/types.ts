export type LeadStatus =
  | "new"
  | "queued"
  | "generating"
  /** Rate-limited or the vendor faltered; sitting out a wait before retrying. */
  | "waiting"
  | "ready"
  | "error"
  | "drafted";

/** How much we trust a value we guessed from the email address. */
export type Confidence = "high" | "low" | "none";

export interface Lead {
  id: string;
  email: string;
  /** Recruiter name. Guessed from the local part, editable. */
  name: string;
  /** Company. Guessed from the domain, editable. */
  company: string;
  /** Role this pitch targets. Falls back to the template default when empty. */
  role: string;
  /** Anything extra worth mentioning to this one person. */
  notes: string;
  subject: string;
  body: string;
  status: LeadStatus;
  error?: string;
  /** While `waiting`: when the next attempt fires, and which retry it is. */
  retryAt?: number;
  retryAttempt?: number;
  retryOf?: number;
  /** Fields the user typed themselves, so we never overwrite them on re-derive. */
  edited: Partial<Record<"name" | "company", true>>;
  nameConfidence: Confidence;
  draftId?: string;
  updatedAt?: number;
}

export interface Template {
  senderName: string;
  senderBackground: string;
  role: string;
  tone: Tone;
  subject: string;
  body: string;
  fallbackName: string;
  fallbackCompany: string;
}

export const TONES = ["warm", "direct", "formal", "casual"] as const;
export type Tone = (typeof TONES)[number];

export interface Settings {
  providerId: string;
  model: string;
  apiKey: string;
  /** `direct` never lets the key or the email leave the browser. */
  transport: "direct" | "relay";
  /** Overrides NEXT_PUBLIC_GOOGLE_CLIENT_ID when set. */
  googleClientId: string;
  concurrency: number;
}

export interface GmailSession {
  accessToken: string;
  /** epoch ms */
  expiresAt: number;
  /**
   * Always empty: the app asks for no identity scope, so it cannot read which
   * account authorised it. Kept so a stored session from an older build still
   * parses.
   */
  email: string;
}
