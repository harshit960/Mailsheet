import type { Lead } from "./types";

const COLUMNS = ["email", "name", "company", "role", "notes", "subject", "body", "status"] as const;

function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(leads: readonly Lead[]): string {
  const rows = leads.map((lead) =>
    COLUMNS.map((key) => escape(String(lead[key] ?? ""))).join(","),
  );
  return [COLUMNS.join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // A BOM keeps Excel from mangling non-ASCII names.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
