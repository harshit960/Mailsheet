"use client";

import { useMemo, useState } from "react";
import { extractEmails } from "@/lib/derive";
import { useApp } from "@/lib/store";
import { Dialog } from "./Dialog";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (count: number, skipped: number) => void;
}

export function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const addLeads = useApp((state) => state.addLeads);
  const [text, setText] = useState("");

  const found = useMemo(() => extractEmails(text), [text]);

  function submit() {
    const added = addLeads(found);
    onImported(added, found.length - added);
    setText("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add addresses"
      description="Paste a column from a sheet, a CSV, or a pile of text. Addresses are pulled out and de-duplicated."
      width={560}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={found.length === 0}
            onClick={submit}
          >
            {found.length > 0
              ? `Add ${found.length} ${found.length === 1 ? "address" : "addresses"}`
              : "Add"}
          </button>
        </>
      }
    >
      <textarea
        className="field font-mono text-[12.5px]"
        rows={11}
        autoFocus
        spellCheck={false}
        placeholder={"jane.doe@stripe.com\ncareers@acme.co.uk\nhiring@example.io"}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <p className="hint">
        {found.length === 0
          ? "Nothing found yet."
          : `${found.length} unique ${found.length === 1 ? "address" : "addresses"} found. Names and companies are guessed from each address and you can correct them in the sheet.`}
      </p>
    </Dialog>
  );
}
