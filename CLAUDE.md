# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

Mailsheet: a single-page Next.js app for recruiter cold outreach. A spreadsheet
of addresses, one template, a model that rewrites it per recipient, and a Gmail
draft per row. No database, no accounts, no backend of its own — everything
lives in the browser.

## Commands

```bash
npm run dev      # next dev on :3000
npm run build    # next build — run before pushing; it typechecks too
npm run lint     # eslint (flat config: next/core-web-vitals + React compiler rules)
npx tsc --noEmit # types only
```

There is no test runner. Behaviour has been verified by driving a production
build (`next start`) with Playwright, stubbing the model vendor and Google
Identity Services at the network layer — the cheapest way to re-verify a change
to the generation or Gmail paths without real credentials.

## The rule that matters

**No user data leaves the browser except to the model vendor and to Google.**
No database, no analytics, no logging, no cookie, no server-side session. If a
change would put user content or an API key through this app's own server as
the default path, it is wrong. `/api/relay` is the single deliberate exception:
opt-in, stateless, and its target URL is rebuilt from the provider registry so
it cannot be aimed at another host.

## Architecture notes

- **State** is two persisted zustand stores in `src/lib/store.ts`:
  `mailsheet.workspace.v1` (rows, template, settings) and `mailsheet.gmail.v1`
  (the access token, kept separate so clearing the workspace does not sign you
  out). Renaming either key strands existing users' data — migrate or bump
  deliberately.
- `onRehydrateStorage` runs **synchronously inside `create()`**, so it must not
  reference `useApp` — that binding is still in the temporal dead zone. An
  exception thrown there is swallowed by zustand and leaves `hasHydrated()`
  false forever, which presents as a permanently blank page.
- **The hydration gate** in `page.tsx` uses `useSyncExternalStore` against
  `hydrationStore`, whose server snapshot is always `false`. Rows come from
  `localStorage`, so rendering them during SSR would be a hydration mismatch.
- **Providers** (`src/lib/ai/`) are the only place that knows a vendor's wire
  format: `buildRequest` / `parseResponse` / `parseError`, registered in
  `PROVIDERS`. The prompt is built centrally in `prompt.ts` and shared across
  vendors — put prompt changes there, not in a provider.
- **Retries** live in `generate()` (`src/lib/ai/index.ts`), not in the UI:
  `RETRY_ATTEMPTS` tries five minutes apart, and only for failures
  `isRetryableStatus` accepts (429/408/5xx). Never retry a 4xx like a rejected
  key — it cannot succeed and the user waits a quarter of an hour to find out.
  The wait is a `sleep` bound to the run's `AbortSignal`, so Stop cuts it
  short; both are overridable per call so tests need not take minutes.
- **The grid memoises rows**, so anything that must change on its own clock —
  the retry countdown, say — needs a component that ticks itself
  (`Countdown` in `LeadGrid.tsx`). Re-rendering the page will not reach a cell,
  and re-rendering every row once a second to move one number is the wrong
  trade anyway.
- **`derive.ts` is heuristics, not truth.** Everything it guesses goes into an
  editable cell, and low-confidence names are underlined in the grid *and*
  flagged to the model so it greets neutrally rather than using a name like
  "Jdoe". Do not make the guesses silent.
- **`mime.ts`** builds RFC 5322 by hand: CRLF line endings, RFC 2047 for
  non-ASCII headers, base64 body wrapped at 76 columns, and header values
  stripped of newlines so a subject cannot inject a `Bcc:`. Test round-trips if
  you touch it.
- **Gmail** uses the GIS implicit flow and asks for `gmail.compose` only. Do not
  widen the scope — `gmail.send`, `gmail.modify` or `mail.google.com` would let
  this app do far more than it needs, and it only ever creates drafts.

## Conventions

- Env vars go through `src/env.ts`, never `process.env` inline. There is one,
  and it is optional and public (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
- Design tokens are CSS custom properties on `:root` in `globals.css`, exposed
  to Tailwind via `@theme inline`. Dark mode redefines the raw variables under
  `prefers-color-scheme`; never define a colour only inside the dark block.
  `@theme` cannot be nested in a media query in Tailwind v4.
- The UI is deliberately plain: neutral greys, one accent, 13px base, no
  gradients, no emoji, no decorative icons. Keep it looking like a tool.
