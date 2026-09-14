/**
 * Every environment variable this app reads, in one place — the same
 * convention the other services in this repo follow.
 *
 * There is only one, and it is optional: without it the app still runs and
 * writes emails, you just cannot push them to Gmail until a client ID is set
 * here or typed into Settings. It is public by design (an OAuth client ID is
 * not a secret) and there are no server-side secrets at all.
 */
export const env = {
  /** Google OAuth 2.0 Web client ID used to create Gmail drafts. */
  googleClientId: (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim(),
} as const;

/** Where this app's source lives. Linked from the header. */
export const REPO_URL = "https://github.com/harshit960/mailsheet";
