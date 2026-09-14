"use client";

import { REPO_URL } from "@/env";
import { FileTextIcon, GithubIcon, SlidersIcon } from "./icons";

interface HeaderProps {
  hasKey: boolean;
  providerLabel: string;
  gmailEmail: string | null;
  gmailBusy: boolean;
  onOpenTemplate: () => void;
  onOpenSettings: () => void;
  onConnectGmail: () => void;
  onDisconnectGmail: () => void;
}

export function Header({
  hasKey,
  providerLabel,
  gmailEmail,
  gmailBusy,
  onOpenTemplate,
  onOpenSettings,
  onConnectGmail,
  onDisconnectGmail,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[14px] font-semibold tracking-[-0.01em]">Mailsheet</h1>
        <p className="hidden text-[11.5px] text-ink-3 sm:block">
          Everything stays in this browser
        </p>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" className="btn btn-ghost" onClick={onOpenTemplate}>
          <FileTextIcon />
          Template
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={onOpenSettings}
          title={hasKey ? `${providerLabel} key set` : "No API key yet"}
        >
          <SlidersIcon />
          Settings
          <span
            className="dot ml-0.5"
            style={{
              background: hasKey ? "var(--color-ok)" : "var(--color-ink-3)",
            }}
          />
        </button>

        <a
          className="btn btn-ghost px-1.5"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          title="Source on GitHub"
          aria-label="Source on GitHub"
        >
          <GithubIcon />
        </a>

        <span className="mx-1 h-4 w-px bg-line" aria-hidden />

        {gmailEmail ? (
          <button
            type="button"
            className="chip max-w-[220px]"
            onClick={onDisconnectGmail}
            title={`Connected as ${gmailEmail} — click to disconnect`}
          >
            <span className="dot" style={{ background: "var(--color-ok)" }} />
            <span className="truncate">{gmailEmail}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={onConnectGmail}
            disabled={gmailBusy}
          >
            {gmailBusy ? "Connecting…" : "Connect Gmail"}
          </button>
        )}
      </div>
    </header>
  );
}
