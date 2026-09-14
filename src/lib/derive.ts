import type { Confidence } from "./types";

/**
 * Everything here is a guess made from the address alone — no lookups, no
 * network. Guesses land in editable cells so they can be corrected before
 * anything is generated or sent.
 */

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "ymail.com",
  "rediffmail.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "zoho.com",
  "fastmail.com",
  "hey.com",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "naver.com",
]);

/** Shared mailboxes — a human name cannot be read out of these. */
const ROLE_ACCOUNTS = new Set([
  "hr",
  "hrteam",
  "careers",
  "career",
  "jobs",
  "job",
  "hiring",
  "recruit",
  "recruiting",
  "recruitment",
  "recruiter",
  "recruiters",
  "talent",
  "talentacquisition",
  "ta",
  "people",
  "peopleops",
  "staffing",
  "apply",
  "application",
  "applications",
  "resume",
  "resumes",
  "cv",
  "info",
  "information",
  "contact",
  "hello",
  "hi",
  "hey",
  "team",
  "admin",
  "office",
  "support",
  "help",
  "helpdesk",
  "sales",
  "marketing",
  "press",
  "media",
  "inbox",
  "mail",
  "mailbox",
  "enquiries",
  "enquiry",
  "inquiries",
  "general",
  "join",
  "work",
  "workwithus",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "bounce",
  "notifications",
  "internships",
  "internship",
  "campus",
]);

/**
 * Second-level suffixes, so `acme.co.uk` reads as `acme` and not `co`.
 * A deliberately short list — a full public-suffix list is not worth the
 * bundle weight for a guess the user can see and fix.
 */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "co.in",
  "net.in",
  "org.in",
  "ac.in",
  "co.jp",
  "co.kr",
  "co.nz",
  "co.za",
  "co.il",
  "co.th",
  "co.id",
  "com.au",
  "net.au",
  "org.au",
  "com.br",
  "com.mx",
  "com.sg",
  "com.hk",
  "com.cn",
  "com.tr",
  "com.tw",
  "com.ar",
  "com.my",
  "com.ph",
  "com.pk",
  "com.vn",
  "com.sa",
  "com.eg",
]);

/** Hostnames that sit in front of the real name. */
const HOST_PREFIXES = new Set([
  "www",
  "mail",
  "email",
  "smtp",
  "careers",
  "jobs",
  "recruiting",
  "talent",
  "apply",
  "hire",
  "hiring",
  "my",
  "go",
  "app",
  "corp",
  "internal",
  "us",
  "eu",
  "in",
]);

/** Names that look wrong in Title Case. */
const ACRONYMS = new Set([
  "ibm",
  "hp",
  "ge",
  "aws",
  "sap",
  "ey",
  "pwc",
  "kpmg",
  "bcg",
  "tcs",
  "hcl",
  "ltd",
  "llc",
  "inc",
  "nyt",
  "bbc",
  "cnn",
  "att",
  "bmw",
  "kfc",
  "ups",
  "ai",
  "io",
  "hsbc",
  "ubs",
  "rbc",
  "dbs",
  "sbi",
  "icici",
  "hdfc",
  "nvidia",
]);

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function splitEmail(email: string): { local: string; domain: string } | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  return {
    local: email.slice(0, at).toLowerCase(),
    domain: email.slice(at + 1).toLowerCase().replace(/\.$/, ""),
  };
}

function titleCase(token: string): string {
  if (!token) return "";
  if (ACRONYMS.has(token.toLowerCase())) return token.toUpperCase();
  return token
    .split(/[-']/)
    .map((part, i, all) =>
      part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : all[i],
    )
    .join(token.includes("'") ? "'" : "-");
}

/** `careers.acme.co.uk` -> `acme` */
export function registrableLabel(domain: string): string {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";

  const lastTwo = parts.slice(-2).join(".");
  const suffixLength = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  let label = parts[Math.max(0, parts.length - suffixLength)];

  // `mail.acme.com` still means Acme.
  if (HOST_PREFIXES.has(label) && parts.length > suffixLength) {
    label = parts[Math.max(0, parts.length - suffixLength - 1)];
  }
  return label ?? "";
}

export function deriveCompany(email: string): string {
  const parsed = splitEmail(email);
  if (!parsed) return "";
  if (FREE_MAIL_DOMAINS.has(parsed.domain)) return "";

  const label = registrableLabel(parsed.domain);
  if (!label) return "";

  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map(titleCase)
    .join(" ");
}

export interface NameGuess {
  name: string;
  confidence: Confidence;
}

export function deriveName(email: string): NameGuess {
  const parsed = splitEmail(email);
  if (!parsed) return { name: "", confidence: "none" };

  // Drop `+tag` and any trailing digits (`john.doe2`).
  const local = parsed.local
    .split("+")[0]
    .replace(/\d+$/, "")
    .replace(/^\d+/, "");

  if (!local || ROLE_ACCOUNTS.has(local.replace(/[._-]/g, ""))) {
    return { name: "", confidence: "none" };
  }

  const tokens = local
    .split(/[._\-\s]+/)
    .map((t) => t.replace(/[^a-z'-]/g, ""))
    .filter(Boolean);

  if (tokens.length === 0) return { name: "", confidence: "none" };

  // A role word anywhere ("careers-emea", "hr.india") means it is not a person.
  if (tokens.some((t) => ROLE_ACCOUNTS.has(t))) {
    return { name: "", confidence: "none" };
  }

  if (tokens.length === 1) {
    const token = tokens[0];
    // Too short to be a name, or long enough to be two names run together.
    if (token.length < 3 || token.length > 14) {
      return { name: "", confidence: "none" };
    }
    // Could be `jdoe` as easily as `john`, so flag it for review.
    return { name: titleCase(token), confidence: "low" };
  }

  const [first, second] = tokens;
  // `j.doe` gives a surname but no usable greeting.
  if (first.length === 1) {
    return {
      name: `${first.toUpperCase()}. ${titleCase(second)}`,
      confidence: "low",
    };
  }

  const name = tokens.slice(0, 3).map(titleCase).join(" ");
  return { name, confidence: second.length === 1 ? "low" : "high" };
}

/** The token to greet with, or "" when we have nothing trustworthy. */
export function greetingName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const clean = first.replace(/\.$/, "");
  return clean.length >= 2 ? clean : "";
}

/** Pull every address out of pasted text — CSV, a column of a sheet, a mail client. */
export function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const email = raw.toLowerCase().replace(/[.,;]+$/, "");
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}
