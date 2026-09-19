/**
 * Client-side checks on a written draft — no model, no network, no cost. They
 * catch the things that quietly sink a cold email: a placeholder that never got
 * filled, no actual ask, a wall of text, or phrasing that trips spam filters.
 * Advisory only; nothing here blocks sending.
 */

export type IssueLevel = "error" | "warning";

export interface QualityIssue {
  level: IssueLevel;
  message: string;
}

/** Phrases that read as mass-mail and hurt deliverability. Lowercased. */
const SPAM_PHRASES = [
  "act now",
  "limited time",
  "100% free",
  "risk-free",
  "dear sir or madam",
  "to whom it may concern",
  "buy now",
  "click here",
  "guarantee",
  "no obligation",
  "this is not spam",
  "cash bonus",
  "earn money",
];

/** A crude but effective call-to-action detector. */
const CTA_SIGNALS = [
  "?", // a question is the most common CTA
  "would you",
  "could you",
  "are you open",
  "let me know",
  "happy to",
  "can we",
  "do you have",
  "what does your",
  "when works",
  "this week",
  "next week",
  "call",
  "chat",
  "reply",
];

const MAX_WORDS = 220;
const MIN_WORDS = 25;

export function checkDraft(subject: string, body: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const trimmedBody = body.trim();
  const trimmedSubject = subject.trim();

  // Unresolved placeholders are the worst outcome — never send "Hi {{name}}".
  const leftover = new Set(
    [...`${subject} ${body}`.matchAll(/\{\{\s*([a-zA-Z]+)[^}]*\}\}/g)].map((m) => m[1]),
  );
  if (leftover.size > 0) {
    issues.push({
      level: "error",
      message: `Unfilled placeholder${leftover.size > 1 ? "s" : ""}: ${[...leftover]
        .map((k) => `{{${k}}}`)
        .join(", ")}`,
    });
  }

  if (!trimmedSubject) {
    issues.push({ level: "error", message: "No subject line." });
  } else if (trimmedSubject.length > 78) {
    issues.push({
      level: "warning",
      message: `Subject is ${trimmedSubject.length} chars — many clients truncate past ~60.`,
    });
  }

  if (!trimmedBody) {
    issues.push({ level: "error", message: "Empty body." });
    return issues;
  }

  const words = trimmedBody.split(/\s+/).length;
  if (words > MAX_WORDS) {
    issues.push({
      level: "warning",
      message: `${words} words — cold emails over ~${MAX_WORDS} rarely get read to the end.`,
    });
  } else if (words < MIN_WORDS) {
    issues.push({
      level: "warning",
      message: `Only ${words} words — likely too thin to land.`,
    });
  }

  const lowerBody = trimmedBody.toLowerCase();
  if (!CTA_SIGNALS.some((signal) => lowerBody.includes(signal))) {
    issues.push({
      level: "warning",
      message: "No clear call to action — say what you'd like them to do.",
    });
  }

  const hay = `${trimmedSubject} ${trimmedBody}`.toLowerCase();
  const spam = SPAM_PHRASES.filter((phrase) => hay.includes(phrase));
  if (spam.length > 0) {
    issues.push({
      level: "warning",
      message: `Spam-filter phrasing: ${spam.map((p) => `"${p}"`).join(", ")}`,
    });
  }

  // A greeting with no name reads as a blast unless it was deliberate.
  if (/^(hi|hello|hey|dear)[,!\s]*$/im.test(trimmedBody.split("\n")[0] ?? "")) {
    issues.push({ level: "warning", message: "Greeting line has no name after it." });
  }

  return issues;
}
