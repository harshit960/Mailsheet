"use client";

import { useRef, useState } from "react";
import { PLACEHOLDERS } from "@/lib/template";
import { TONES } from "@/lib/types";
import { useApp } from "@/lib/store";
import { Dialog } from "./Dialog";
import { FileTextIcon } from "./icons";

export function TemplateDialog({
  open,
  onClose,
  onBrowseLibrary,
}: {
  open: boolean;
  onClose: () => void;
  onBrowseLibrary: () => void;
}) {
  const template = useApp((state) => state.template);
  const setTemplate = useApp((state) => state.setTemplate);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState<"subject" | "body">("body");

  /** Drop a placeholder where the caret is, so it reads like typing it. */
  function insert(token: string) {
    const target = focused === "subject" ? subjectRef.current : bodyRef.current;
    if (!target) return;

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const next = `${target.value.slice(0, start)}${token}${target.value.slice(end)}`;

    setTemplate({ [focused]: next });
    requestAnimationFrame(() => {
      target.focus();
      const caret = start + token.length;
      target.setSelectionRange(caret, caret);
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Template"
      description="Write it once. Every row is a rewrite of this, not a new email."
      width={680}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-sunken px-3 py-2.5">
          <p className="text-[12px] leading-relaxed text-ink-2">
            Not sure where to start? Load a proven pattern and tweak it.
          </p>
          <button
            type="button"
            className="btn btn-sm flex-none"
            onClick={onBrowseLibrary}
          >
            <FileTextIcon />
            Browse library
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sender-name">
              Your name
            </label>
            <input
              id="sender-name"
              className="field"
              placeholder="Alex Rivera"
              value={template.senderName}
              onChange={(event) => setTemplate({ senderName: event.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="default-role">
              Role you are targeting
            </label>
            <input
              id="default-role"
              className="field"
              placeholder="Backend Engineer"
              value={template.role}
              onChange={(event) => setTemplate({ role: event.target.value })}
            />
            <p className="hint">A row&apos;s own Role column overrides this.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="background">
            About you
          </label>
          <textarea
            id="background"
            className="field"
            rows={3}
            placeholder="Three years on payments infrastructure at a fintech; Go, Postgres, Kafka. Shipped a ledger rewrite that cut reconciliation time 80%."
            value={template.senderBackground}
            onChange={(event) => setTemplate({ senderBackground: event.target.value })}
          />
          <p className="hint">
            The only facts the model is allowed to draw on. It is told not to invent
            anything about you or the company beyond this.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
          <div>
            <span className="label">Tone</span>
            <div className="seg">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={template.tone === tone}
                  onClick={() => setTemplate({ tone })}
                  className="capitalize"
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <span className="label">Insert placeholder</span>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="chip font-mono"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insert(`{{${key}}}`)}
                >
                  {`{{${key}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="subject-template">
            Subject
          </label>
          <input
            id="subject-template"
            ref={subjectRef}
            className="field"
            value={template.subject}
            onFocus={() => setFocused("subject")}
            onChange={(event) => setTemplate({ subject: event.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="body-template">
            Body
          </label>
          <textarea
            id="body-template"
            ref={bodyRef}
            className="field leading-relaxed"
            rows={13}
            value={template.body}
            onFocus={() => setFocused("body")}
            onChange={(event) => setTemplate({ body: event.target.value })}
          />
        </div>

        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fallback-name">
              When no name is known
            </label>
            <input
              id="fallback-name"
              className="field"
              placeholder="there"
              value={template.fallbackName}
              onChange={(event) => setTemplate({ fallbackName: event.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="fallback-company">
              When no company is known
            </label>
            <input
              id="fallback-company"
              className="field"
              placeholder="your team"
              value={template.fallbackCompany}
              onChange={(event) => setTemplate({ fallbackCompany: event.target.value })}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
