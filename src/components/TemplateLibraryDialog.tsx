"use client";

import { useMemo, useState } from "react";
import { adaptTemplate, getProvider } from "@/lib/ai";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_LIBRARY,
  type LibraryTemplate,
} from "@/lib/templates/library";
import { useApp } from "@/lib/store";
import { Dialog } from "./Dialog";
import { ExternalIcon, SparkIcon } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onApplied: (message: string) => void;
}

export function TemplateLibraryDialog({ open, onClose, onApplied }: Props) {
  const template = useApp((s) => s.template);
  const setTemplate = useApp((s) => s.setTemplate);
  const settings = useApp((s) => s.settings);

  const [selectedId, setSelectedId] = useState<string>(TEMPLATE_LIBRARY[0].id);
  const [category, setCategory] = useState<string>("All");
  const [adapting, setAdapting] = useState(false);
  const [error, setError] = useState<string>("");

  const shown = useMemo(
    () =>
      category === "All"
        ? TEMPLATE_LIBRARY
        : TEMPLATE_LIBRARY.filter((t) => t.category === category),
    [category],
  );

  const selected =
    shown.find((t) => t.id === selectedId) ?? shown[0] ?? TEMPLATE_LIBRARY[0];
  const hasKey = settings.apiKey.trim().length > 0;

  function applyAsIs(t: LibraryTemplate) {
    setTemplate({ subject: t.subject, body: t.body, tone: t.tone });
    onApplied(`Loaded "${t.name}" into your template.`);
    onClose();
  }

  async function adapt(t: LibraryTemplate) {
    setError("");
    setAdapting(true);
    try {
      const result = await adaptTemplate({
        providerId: settings.providerId,
        model: settings.model,
        apiKey: settings.apiKey.trim(),
        transport: settings.transport,
        input: {
          templateName: t.name,
          templateSubject: t.subject,
          templateBody: t.body,
          tone: t.tone,
          senderName: template.senderName,
          senderBackground: template.senderBackground,
          role: template.role,
        },
      });
      setTemplate({ subject: result.subject, body: result.body, tone: t.tone });
      onApplied(`Adapted "${t.name}" to your voice.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not adapt this template.");
    } finally {
      setAdapting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Template library"
      description="Proven starting points, written for this app. Load one as-is, or let the model rewrite it in your voice first."
      width={860}
    >
      <div className="flex flex-wrap gap-1.5">
        {["All", ...TEMPLATE_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={category === c}
            style={
              category === c
                ? { borderColor: "var(--color-ink)", color: "var(--color-ink)" }
                : undefined
            }
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[240px_1fr]">
        {/* list */}
        <ul className="max-h-[420px] space-y-0.5 overflow-y-auto sm:border-r sm:border-line sm:pr-3">
          {shown.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="w-full rounded-md px-2.5 py-2 text-left"
                style={
                  t.id === selected.id
                    ? { background: "var(--color-sunken)" }
                    : undefined
                }
              >
                <span className="block text-[13px] font-medium">{t.name}</span>
                <span className="block truncate text-[11.5px] text-ink-3">
                  {t.useWhen}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* preview */}
        <div className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-semibold">{selected.name}</h3>
            <span className="text-[11.5px] capitalize text-ink-3">
              {selected.tone} · {selected.category}
            </span>
          </div>

          <div className="rounded-md border border-line bg-sunken p-3">
            <p className="text-[11.5px] font-medium text-ink-2">
              {selected.subject}
            </p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-ink">
              {selected.body}
            </pre>
          </div>

          <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Why it works. </span>
            {selected.whyItWorks}
          </p>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
            <span>Pattern discussed by:</span>
            {selected.sources.map((src) => (
              <a
                key={src.url}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent underline underline-offset-2"
              >
                {src.label}
                <ExternalIcon className="size-3" />
              </a>
            ))}
          </p>

          {error ? (
            <p className="mt-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[12px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn"
              disabled={adapting}
              onClick={() => applyAsIs(selected)}
            >
              Use as-is
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={adapting || !hasKey}
              title={
                hasKey ? undefined : "Add a model API key in Settings to adapt"
              }
              onClick={() => adapt(selected)}
            >
              <SparkIcon />
              {adapting ? "Adapting…" : "Adapt to me"}
            </button>
            {!hasKey ? (
              <span className="text-[11.5px] text-ink-3">
                Adapting needs a {getProvider(settings.providerId).label} key.
              </span>
            ) : !template.senderBackground.trim() ? (
              <span className="text-[11.5px] text-ink-3">
                Fill in “About you” for a better adaptation.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
