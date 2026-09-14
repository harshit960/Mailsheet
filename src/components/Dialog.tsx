"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Native <dialog>, so Escape, focus trapping and inertness come from the
 * platform rather than from hand-rolled key handlers.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  width = 560,
  children,
  footer,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet m-auto"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="sheet-panel" style={{ ["--sheet-width" as string]: `${width}px` }}>
        <header className="flex items-start gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm -mr-1.5 mt-px px-1.5"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-sunken px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
