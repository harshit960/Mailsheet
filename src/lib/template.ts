import { greetingName } from "./derive";
import type { Lead, Template } from "./types";

export const PLACEHOLDERS = ["name", "company", "role", "sender"] as const;
export type PlaceholderKey = (typeof PLACEHOLDERS)[number];

export interface TemplateVars {
  name: string;
  company: string;
  role: string;
  sender: string;
}

export function leadVars(lead: Lead, template: Template): TemplateVars {
  return {
    name: greetingName(lead.name) || template.fallbackName,
    company: lead.company.trim() || template.fallbackCompany,
    role: lead.role.trim() || template.role.trim(),
    sender: template.senderName.trim(),
  };
}

/**
 * Replaces `{{name}}`, and `{{name|fallback}}` when a per-placeholder fallback
 * reads better than the global one. Unknown keys are left alone so a stray
 * brace in the body never silently disappears.
 */
export function render(text: string, vars: TemplateVars): string {
  return text.replace(
    /\{\{\s*([a-zA-Z]+)\s*(?:\|([^}]*))?\}\}/g,
    (match, rawKey: string, fallback?: string) => {
      const key = rawKey.toLowerCase() as PlaceholderKey;
      if (!PLACEHOLDERS.includes(key)) return match;
      const value = vars[key]?.trim();
      if (value) return value;
      return (fallback ?? "").trim();
    },
  );
}

export const DEFAULT_TEMPLATE: Template = {
  senderName: "",
  senderBackground: "",
  role: "",
  tone: "warm",
  subject: "{{role}} at {{company}}",
  body: `Hi {{name}},

I came across {{company}} and wanted to reach out directly about the {{role}} opening.

I've spent the last few years building and shipping production software end to end, and the work your team is doing lines up closely with what I want to do next. I'd love to send over my resume and find fifteen minutes to talk.

Would this week work?

Thanks,
{{sender}}`,
  fallbackName: "there",
  fallbackCompany: "your team",
};
