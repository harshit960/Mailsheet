"use client";

import { UploadIcon } from "./icons";

interface EmptyStateProps {
  hasTemplate: boolean;
  hasKey: boolean;
  onImport: () => void;
  onOpenTemplate: () => void;
  onOpenSettings: () => void;
}

export function EmptyState({
  hasTemplate,
  hasKey,
  onImport,
  onOpenTemplate,
  onOpenSettings,
}: EmptyStateProps) {
  const steps = [
    {
      label: "Write your template once",
      done: hasTemplate,
      action: onOpenTemplate,
      cta: "Open template",
    },
    {
      label: "Add a model API key",
      done: hasKey,
      action: onOpenSettings,
      cta: "Open settings",
    },
    {
      label: "Paste recruiter addresses",
      done: false,
      action: onImport,
      cta: "Paste addresses",
    },
  ];

  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
          Nothing here yet
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
          Paste a list of recruiter addresses and each one becomes a row. Names and
          companies are read off the addresses, then your template is rewritten for
          each person.
        </p>

        <ol className="mt-5 space-y-px">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
            >
              <span
                className="dot"
                style={{
                  background: step.done ? "var(--color-ok)" : "var(--color-line-2)",
                }}
              />
              <span className="flex-1 text-[12.5px] text-ink">
                <span className="mr-1.5 text-ink-3 tabular-nums">{index + 1}</span>
                {step.label}
              </span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={step.action}>
                {step.cta}
              </button>
            </li>
          ))}
        </ol>

        <button type="button" className="btn btn-primary mt-5" onClick={onImport}>
          <UploadIcon />
          Paste addresses
        </button>
      </div>
    </div>
  );
}
