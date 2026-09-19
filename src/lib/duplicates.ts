import { registrableLabel, splitEmail } from "./derive";
import type { Lead } from "./types";

/**
 * Catches the two embarrassments of bulk outreach: emailing the same person
 * twice, and hitting one company from ten angles at once. Domain grouping
 * ignores free-mail hosts, where a shared domain means nothing.
 */

/**
 * Free-mail providers matched on the registrable label, not by substring — a
 * corporate domain like "acme.com" contains "me" but is not iCloud.
 */
const FREE_LABELS = new Set([
  "gmail",
  "googlemail",
  "outlook",
  "hotmail",
  "live",
  "msn",
  "yahoo",
  "ymail",
  "rediffmail",
  "proton",
  "protonmail",
  "pm",
  "icloud",
  "me",
  "mac",
  "aol",
  "gmx",
  "mail",
  "zoho",
  "fastmail",
  "hey",
  "yandex",
  "qq",
  "naver",
]);

export interface DuplicateReport {
  /** Addresses that appear on more than one row. */
  duplicateEmails: string[];
  /** Company domains targeted by several rows at once: domain → count. */
  crowdedDomains: { domain: string; count: number }[];
}

export function findDuplicates(
  leads: readonly Lead[],
  domainThreshold = 3,
): DuplicateReport {
  const emailCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();

  for (const lead of leads) {
    const email = lead.email.trim().toLowerCase();
    if (!email) continue;

    emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);

    const parsed = splitEmail(email);
    if (parsed && !FREE_LABELS.has(registrableLabel(parsed.domain))) {
      domainCounts.set(parsed.domain, (domainCounts.get(parsed.domain) ?? 0) + 1);
    }
  }

  const duplicateEmails = [...emailCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email]) => email);

  const crowdedDomains = [...domainCounts.entries()]
    .filter(([, count]) => count >= domainThreshold)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  return { duplicateEmails, crowdedDomains };
}

/** A one-line human summary, or "" when there is nothing to warn about. */
export function duplicateWarning(report: DuplicateReport): string {
  const parts: string[] = [];
  if (report.duplicateEmails.length > 0) {
    const n = report.duplicateEmails.length;
    parts.push(`${n} address${n > 1 ? "es appear" : " appears"} more than once`);
  }
  if (report.crowdedDomains.length > 0) {
    const top = report.crowdedDomains[0];
    parts.push(`${top.count} rows target ${top.domain}`);
  }
  return parts.join("; ");
}
