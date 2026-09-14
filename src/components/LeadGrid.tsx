"use client";

import { useMemo } from "react";
import {
  DataGrid,
  SelectColumn,
  type Column,
  type RenderEditCellProps,
  type RowsChangeData,
} from "react-data-grid";
import type { Lead, LeadStatus } from "@/lib/types";
import { isEmail } from "@/lib/derive";

type EditableKey = "email" | "name" | "company" | "role" | "notes";

const STATUS: Record<LeadStatus, { label: string; color: string; pulse?: boolean }> = {
  new: { label: "Not written", color: "var(--color-ink-3)" },
  queued: { label: "Queued", color: "var(--color-ink-3)" },
  generating: { label: "Writing", color: "var(--color-accent)", pulse: true },
  ready: { label: "Ready", color: "var(--color-ok)" },
  error: { label: "Error", color: "var(--color-danger)" },
  drafted: { label: "In Gmail", color: "var(--color-accent)" },
};

function CellEditor({ row, column, onRowChange, onClose }: RenderEditCellProps<Lead>) {
  const key = column.key as EditableKey;
  return (
    <input
      className="cell-input"
      autoFocus
      spellCheck={false}
      value={row[key] ?? ""}
      onChange={(event) => onRowChange({ ...row, [key]: event.target.value })}
      onBlur={() => onClose(true, false)}
    />
  );
}

function Muted({ children }: { children: string }) {
  return <span className="text-ink-3">{children}</span>;
}

interface LeadGridProps {
  leads: Lead[];
  selected: ReadonlySet<string>;
  onSelectedChange: (next: Set<string>) => void;
  activeId: string | null;
  onActivate: (id: string) => void;
  onEdit: (id: string, patch: Partial<Lead>) => void;
}

export function LeadGrid({
  leads,
  selected,
  onSelectedChange,
  activeId,
  onActivate,
  onEdit,
}: LeadGridProps) {
  const columns = useMemo<Column<Lead>[]>(
    () => [
      { ...SelectColumn, width: 38, minWidth: 38, maxWidth: 38, resizable: false },
      {
        key: "email",
        name: "Email",
        width: 230,
        minWidth: 160,
        renderEditCell: CellEditor,
        cellClass: (row) =>
          row.email && !isEmail(row.email) ? "text-danger" : undefined,
        renderCell: ({ row }) =>
          row.email ? (
            <span className="truncate font-mono text-[12px]">{row.email}</span>
          ) : (
            <Muted>Add an address</Muted>
          ),
      },
      {
        key: "name",
        name: "Name",
        width: 150,
        minWidth: 90,
        renderEditCell: CellEditor,
        renderCell: ({ row }) => {
          if (!row.name) return <Muted>no name</Muted>;
          const guessed = row.nameConfidence === "low";
          return (
            <span
              className={`truncate ${guessed ? "decoration-dotted underline underline-offset-[3px] decoration-ink-3" : ""}`}
              title={guessed ? "Guessed from the address — worth a glance" : undefined}
            >
              {row.name}
            </span>
          );
        },
      },
      {
        key: "company",
        name: "Company",
        width: 150,
        minWidth: 90,
        renderEditCell: CellEditor,
        renderCell: ({ row }) =>
          row.company ? (
            <span className="truncate">{row.company}</span>
          ) : (
            <Muted>unknown</Muted>
          ),
      },
      {
        key: "role",
        name: "Role",
        width: 150,
        minWidth: 90,
        renderEditCell: CellEditor,
        renderCell: ({ row }) =>
          row.role ? <span className="truncate">{row.role}</span> : <Muted>default</Muted>,
      },
      {
        key: "notes",
        name: "Notes",
        width: 160,
        minWidth: 90,
        renderEditCell: CellEditor,
        renderCell: ({ row }) =>
          row.notes ? <span className="truncate">{row.notes}</span> : <Muted>—</Muted>,
      },
      {
        key: "status",
        name: "Status",
        width: 118,
        minWidth: 100,
        resizable: false,
        renderCell: ({ row }) => {
          const status = STATUS[row.status];
          return (
            <span
              className="flex items-center gap-1.5 truncate"
              title={row.error || status.label}
            >
              <span
                className={`dot ${status.pulse ? "animate-pulse" : ""}`}
                style={{ background: status.color }}
              />
              <span className={row.status === "error" ? "text-danger" : "text-ink-2"}>
                {row.status === "error" ? row.error || "Error" : status.label}
              </span>
            </span>
          );
        },
      },
      {
        key: "subject",
        name: "Subject",
        width: 260,
        minWidth: 120,
        renderCell: ({ row }) =>
          row.subject ? (
            <span className="truncate">{row.subject}</span>
          ) : (
            <Muted>—</Muted>
          ),
      },
      {
        key: "body",
        name: "Preview",
        minWidth: 200,
        renderCell: ({ row }) =>
          row.body ? (
            <span className="truncate text-ink-2">{row.body.replace(/\s+/g, " ")}</span>
          ) : (
            <Muted>—</Muted>
          ),
      },
    ],
    [],
  );

  function handleRowsChange(rows: Lead[], { indexes, column }: RowsChangeData<Lead>) {
    const key = column.key as EditableKey;
    for (const index of indexes) {
      const row = rows[index];
      if (!row) continue;
      onEdit(row.id, { [key]: row[key] } as Partial<Lead>);
    }
  }

  return (
    <DataGrid
      className="rdg"
      columns={columns}
      rows={leads}
      rowKeyGetter={(row) => row.id}
      onRowsChange={handleRowsChange}
      selectedRows={selected}
      onSelectedRowsChange={onSelectedChange}
      onCellClick={({ row }) => onActivate(row.id)}
      rowClass={(row) => (row.id === activeId ? "row-active" : undefined)}
      rowHeight={34}
      headerRowHeight={34}
      defaultColumnOptions={{ resizable: true }}
    />
  );
}
