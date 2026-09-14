import { buildRawMessage } from "./mime";
import type { GmailSession } from "./types";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const GSI_SRC = "https://accounts.google.com/gsi/client";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string; hint?: string }): void;
}

interface GoogleAccounts {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

let scriptPromise: Promise<GoogleAccounts> | null = null;

function loadGsi(): Promise<GoogleAccounts> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Gmail is only available in the browser"));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);

  scriptPromise ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google);
      else reject(new Error("Google sign-in loaded but is unavailable"));
    };
    const onError = () => {
      scriptPromise = null;
      reject(new Error("Could not load Google sign-in"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

export class GmailError extends Error {
  constructor(
    message: string,
    /** The token is gone or was rejected — reconnecting is the fix. */
    readonly needsReauth = false,
  ) {
    super(message);
    this.name = "GmailError";
  }
}

/**
 * Implicit OAuth in the browser: Google hands the token straight to this page,
 * so no server of ours ever sees it. It expires in about an hour and there is
 * no refresh token to store, which is exactly what we want.
 */
export async function connectGmail(clientId: string): Promise<GmailSession> {
  if (!clientId.trim()) {
    throw new GmailError("No Google OAuth client ID configured");
  }
  const google = await loadGsi();

  const token = await new Promise<TokenResponse>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: GMAIL_SCOPES,
      callback: resolve,
      error_callback: (error) =>
        reject(
          new GmailError(
            error.type === "popup_closed"
              ? "Sign-in window was closed"
              : error.message || "Google sign-in failed",
          ),
        ),
    });
    client.requestAccessToken({ prompt: "" });
  });

  if (token.error || !token.access_token) {
    throw new GmailError(
      token.error_description || token.error || "Google did not return a token",
    );
  }

  const accessToken = token.access_token;
  const expiresAt = Date.now() + (token.expires_in ?? 3600) * 1000;

  return { accessToken, expiresAt, email: await fetchEmail(accessToken) };
}

async function fetchEmail(accessToken: string): Promise<string> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return "";
    const data = (await response.json()) as { email?: string };
    return data.email ?? "";
  } catch {
    return "";
  }
}

export function disconnectGmail(session: GmailSession | null): void {
  if (!session?.accessToken) return;
  try {
    window.google?.accounts.oauth2.revoke(session.accessToken);
  } catch {
    // Revocation is best-effort; dropping the token locally is what matters.
  }
}

export function isExpired(session: GmailSession | null): boolean {
  // A minute of slack so a draft never fails mid-flight.
  return !session || session.expiresAt - 60_000 <= Date.now();
}

export interface DraftResult {
  draftId: string;
}

export async function createDraft(
  session: GmailSession,
  message: { to: string; subject: string; body: string },
  signal?: AbortSignal,
): Promise<DraftResult> {
  if (isExpired(session)) {
    throw new GmailError("Gmail session expired — reconnect to continue", true);
  }

  let response: Response;
  try {
    response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: { raw: buildRawMessage(message) } }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GmailError("Could not reach Gmail");
  }

  if (response.status === 401 || response.status === 403) {
    throw new GmailError("Gmail rejected the session — reconnect to continue", true);
  }

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new GmailError(
      data.error?.message || `Gmail draft failed (HTTP ${response.status})`,
    );
  }
  if (!data.id) throw new GmailError("Gmail did not return a draft id");

  return { draftId: data.id };
}

export function draftsUrl(email: string): string {
  const base = "https://mail.google.com/mail/";
  return email
    ? `${base}u/?authuser=${encodeURIComponent(email)}#drafts`
    : `${base}u/0/#drafts`;
}
