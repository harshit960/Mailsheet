"use client";

import { DownloadIcon, MailIcon, PlusIcon, SparkIcon, StopIcon, TrashIcon, UploadIcon } from "./icons";

interface ToolbarProps {
  total: number;
  selectedCount: number;
  writableCount: number;
  draftableCount: number;
  running: boolean;
  hasKey: boolean;
  gmailReady: boolean;
  onAddRow: () => void;
  onImport: () => void;
  onGenerate: () => void;
  onDraft: () => void;
  onStop: () => void;
  onExport: () => void;
  onDelete: () => void;
}

function count(n: number) {
  return n > 0 ? ` ${n}` : "";
}

export function Toolbar({
  total,
  selectedCount,
  writableCount,
  draftableCount,
  running,
  hasKey,
  gmailReady,
  onAddRow,
  onImport,
  onGenerate,
  onDraft,
  onStop,
  onExport,
  onDelete,
}: ToolbarProps) {
  const scope = selectedCount > 0 ? "selected" : "all";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-sunken px-4 py-2">
      <button type="button" className="btn" onClick={onAddRow}>
        <PlusIcon />
        Row
      </button>
      <button type="button" className="btn" onClick={onImport}>
        <UploadIcon />
        Paste addresses
      </button>

      <span className="mx-1 h-4 w-px bg-line-2" aria-hidden />

      {running ? (
        <button type="button" className="btn" onClick={onStop}>
          <StopIcon />
          Stop
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          onClick={onGenerate}
          disabled={writableCount === 0}
          title={
            hasKey
              ? `Rewrite your template for the ${scope} rows that have an address`
              : "No API key yet — rows will be filled straight from your template, without personalising"
          }
        >
          <SparkIcon />
          Write{count(writableCount)}
        </button>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onDraft}
        disabled={running || !gmailReady || draftableCount === 0}
        title={gmailReady ? `Create Gmail drafts for the ${scope} written rows` : "Connect Gmail first"}
      >
        <MailIcon />
        Create drafts{count(draftableCount)}
      </button>

      <span className="mx-1 h-4 w-px bg-line-2" aria-hidden />

      <button type="button" className="btn btn-ghost" onClick={onExport} disabled={total === 0}>
        <DownloadIcon />
        CSV
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onDelete}
        disabled={selectedCount === 0}
      >
        <TrashIcon />
        Delete{count(selectedCount)}
      </button>

      <p className="ml-auto text-[11.5px] text-ink-3">
        {total} {total === 1 ? "row" : "rows"}
        {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
      </p>
    </div>
  );
}
