"use client";

import { useState } from "react";
import { PROVIDERS, getProvider } from "@/lib/ai";
import { env } from "@/env";
import { useApp, useGmail, resolveClientId } from "@/lib/store";
import { Dialog } from "./Dialog";
import { ExternalIcon } from "./icons";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useApp((state) => state.settings);
  const setSettings = useApp((state) => state.setSettings);
  const resetAll = useApp((state) => state.resetAll);
  const setSession = useGmail((state) => state.setSession);
  const [showKey, setShowKey] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const provider = getProvider(settings.providerId);
  const envClientId = Boolean(env.googleClientId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      description="Stored in this browser's localStorage. Nothing is sent to a server of ours."
      width={580}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Model
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="provider">
                Provider
              </label>
              <select
                id="provider"
                className="field"
                value={settings.providerId}
                onChange={(event) =>
                  setSettings({ providerId: event.target.value, model: "" })
                }
              >
                {PROVIDERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="model">
                Model
              </label>
              <input
                id="model"
                className="field"
                list="model-options"
                placeholder={provider.defaultModel}
                value={settings.model}
                onChange={(event) => setSettings({ model: event.target.value })}
              />
              <datalist id="model-options">
                {provider.models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="mt-3">
            <label className="label" htmlFor="api-key">
              API key
            </label>
            <div className="flex gap-2">
              <input
                id="api-key"
                className="field font-mono text-[12px]"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder={provider.keyHint}
                value={settings.apiKey}
                onChange={(event) => setSettings({ apiKey: event.target.value })}
              />
              <button
                type="button"
                className="btn"
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="hint">
              Kept in localStorage on this device only.{" "}
              <a
                className="inline-flex items-center gap-1 text-accent underline underline-offset-2"
                href={provider.keyUrl}
                target="_blank"
                rel="noreferrer"
              >
                Get a key
                <ExternalIcon className="size-3" />
              </a>
            </p>
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Requests
          </h3>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="label">How model calls are sent</span>
              <div className="seg">
                <button
                  type="button"
                  aria-pressed={settings.transport === "direct"}
                  onClick={() => setSettings({ transport: "direct" })}
                >
                  Direct from browser
                </button>
                <button
                  type="button"
                  aria-pressed={settings.transport === "relay"}
                  onClick={() => setSettings({ transport: "relay" })}
                >
                  Via this site
                </button>
              </div>
              <p className="hint">
                {settings.transport === "direct"
                  ? `Your browser calls ${provider.label} itself, so the key and your drafts never touch this site. Falls back automatically if the browser blocks it.`
                  : `Requests pass through this site's /api/relay route, which forwards them once and stores nothing. Use only if direct calls are blocked.`}
              </p>
            </div>

            <div className="sm:w-28">
              <label className="label" htmlFor="concurrency">
                At a time
              </label>
              <input
                id="concurrency"
                className="field"
                type="number"
                min={1}
                max={8}
                value={settings.concurrency}
                onChange={(event) =>
                  setSettings({
                    concurrency: Math.min(
                      8,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className="border-t border-line pt-4">
          <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Gmail
          </h3>
          <label className="label" htmlFor="client-id">
            Google OAuth client ID
          </label>
          <input
            id="client-id"
            className="field font-mono text-[12px]"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              envClientId ? "Using the one this deployment ships with" : "xxxx.apps.googleusercontent.com"
            }
            value={settings.googleClientId}
            onChange={(event) => setSettings({ googleClientId: event.target.value })}
          />
          <p className="hint">
            {resolveClientId(settings)
              ? "Drafts are created straight from your browser with a token Google hands to this page. The token expires in about an hour and is never sent anywhere else."
              : "Needed before you can create Gmail drafts. Create an OAuth client (type: Web application) in Google Cloud Console, enable the Gmail API, and add this site's origin as an authorised JavaScript origin."}
          </p>
        </section>

        <section className="border-t border-line pt-4">
          <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            Local data
          </h3>
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-ink-2">
                Erase all rows, your template, your key and the Gmail session?
              </span>
              <button
                type="button"
                className="btn"
                style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                onClick={() => {
                  resetAll();
                  setSession(null);
                  setConfirmReset(false);
                  onClose();
                }}
              >
                Erase everything
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
              Clear all local data
            </button>
          )}
        </section>
      </div>
    </Dialog>
  );
}
