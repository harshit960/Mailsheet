"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/types";
import { CloseIcon, CopyIcon, ExternalIcon, MailIcon, SparkIcon } from "./icons";

interface InspectorProps {
  lead: Lead;
  onChange: (patch: Partial<Lead>) => void;
  onClose: () => void;
  onGenerate: () => void;
  onDraft: () => void;
  hasKey: boolean;
  gmailReady: boolean;
  draftsHref: string;
}

export function Inspector({
  lead,
  onChange,
  onClose,
  onGenerate,
  onDraft,
  hasKey,
  gmailReady,
  draftsHref,
}: InspectorProps) {
  const [copied, setCopied] = useState(false);
  const busy = lead.status === "generating" || lead.status === "queued";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `Subject: ${lead.subject}\n\n${lead.body}`.trim(),
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-line bg-surface lg:w-[400px] lg:border-l">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12px] text-ink">
            {lead.email || "No address yet"}
          </p>
          <p className="truncate text-[11.5px] text-ink-2">
            {[lead.name, lead.company].filter(Boolean).join(" · ") || "Nothing known yet"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm px-1.5"
          onClick={onClose}
          aria-label="Close panel"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className="label" htmlFor="lead-notes">
            Notes for this person
          </label>
          <input
            id="lead-notes"
            className="field"
            placeholder="Met at the Bangalore meetup; hiring for the platform team"
            value={lead.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </div>

        <div className="border-t border-line pt-4">
          <label className="label" htmlFor="lead-subject">
            Subject
          </label>
          <input
            id="lead-subject"
            className="field"
            placeholder={busy ? "Writing…" : "Not written yet"}
            value={lead.subject}
            onChange={(event) => onChange({ subject: event.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="lead-body">
            Body
          </label>
          <textarea
            id="lead-body"
            className="field min-h-[280px] leading-relaxed"
            rows={16}
            placeholder={
              busy ? "Writing…" : "Generate this row, or write the email here yourself."
            }
            value={lead.body}
            onChange={(event) => onChange({ body: event.target.value })}
          />
          <p className="hint">
            {lead.body
              ? `${lead.body.trim().split(/\s+/).length} words. Edits are yours to keep — regenerating replaces them.`
              : "Edits here are saved to this row."}
          </p>
        </div>

        {lead.status === "error" && lead.error ? (
          <p className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] leading-relaxed text-danger">
            {lead.error}
          </p>
        ) : null}

        {lead.status === "drafted" ? (
          <a
            className="inline-flex items-center gap-1.5 text-[12px] text-accent underline underline-offset-2"
            href={draftsHref}
            target="_blank"
            rel="noreferrer"
          >
            Open Gmail drafts
            <ExternalIcon className="size-3" />
          </a>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-sunken px-4 py-3">
        <button
          type="button"
          className="btn"
          onClick={onGenerate}
          disabled={busy || !lead.email.trim()}
          title={
            hasKey
              ? undefined
              : "No API key yet — this fills from your template without personalising"
          }
        >
          <SparkIcon />
          {lead.body ? "Rewrite" : "Write"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onDraft}
          disabled={!gmailReady || !lead.body.trim() || !lead.email.trim()}
          title={gmailReady ? undefined : "Connect Gmail first"}
        >
          <MailIcon />
          {lead.status === "drafted" ? "Draft again" : "Create draft"}
        </button>
        <button
          type="button"
          className="btn btn-ghost ml-auto"
          onClick={copy}
          disabled={!lead.body.trim()}
        >
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
      </footer>
    </aside>
  );
}
