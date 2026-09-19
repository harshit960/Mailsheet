import type { AdaptInput, GenerationInput, PromptParts } from "./types";

const SYSTEM = `You personalise cold outreach emails that a job seeker sends to recruiters.

You are given one template the sender wrote, plus what little is known about the recipient. Rewrite the template for that recipient.

Rules:
- Keep the sender's structure, length, intent and voice. This is an edit, not a new email. Stay within roughly 15% of the template's word count.
- Never invent facts. Do not claim to have read the company's blog, used its product, met anyone, or know anything about its funding, size, mission or recent news unless the sender's own notes say so. Vague praise you cannot support is worse than none.
- The company name is derived from the email domain and may be slightly off. Use it naturally if it looks like a real company name; if it looks like a fragment or a placeholder, write around it.
- The recipient name may be a guess. If it is flagged as a guess and does not look like a plausible human given name, greet without a name instead of risking the wrong one.
- If no name or company is known, keep those parts generic rather than leaving empty brackets or placeholder text.
- Resolve every {{placeholder}} in the template. None may survive into the output.
- Plain text only. No markdown, no bullet symbols, no subject line inside the body, no signature block beyond what the template has.
- Subject line: under 70 characters, no clickbait, no emoji.

Return JSON with exactly two string fields: "subject" and "body".`;

function line(label: string, value: string): string {
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}\n` : "";
}

export function buildPrompt(input: GenerationInput): PromptParts {
  let user = "RECIPIENT\n";
  user += line("Email", input.email);
  user += input.name
    ? line(
        "Name",
        input.nameIsGuess
          ? `${input.name} (GUESSED from the email address — may not be a real given name)`
          : input.name,
      )
    : "Name: unknown — greet without a name\n";
  user += input.company
    ? line("Company", input.company)
    : "Company: unknown — keep company references generic\n";
  user += line("Role being targeted", input.role);
  user += line("Notes about this recipient", input.notes);

  if (input.jobDescription.trim()) {
    user += "\nJOB DESCRIPTION (the actual posting — draw specifics from here, do not quote it verbatim)\n";
    user += input.jobDescription.trim();
    user += "\n";
  }

  user += "\nSENDER\n";
  user += line("Name", input.senderName);
  user += line("Background the email may draw on", input.senderBackground);

  user += `\nTONE\n${input.tone}\n`;

  user += "\nTEMPLATE SUBJECT\n";
  user += input.templateSubject.trim() || "(none — write one)";
  user += "\n\nTEMPLATE BODY\n";
  user += input.templateBody.trim();

  return { system: SYSTEM, user };
}


const ADAPT_SYSTEM = `You rewrite a proven cold-email template so it sounds like a specific job seeker wrote it.

You are given a template that captures a pattern, plus what the sender tells you about themselves. Rewrite the template in the sender's voice at the given tone.

Rules:
- Keep the template's structure, arc and intent. Keep it roughly the same length. This is a re-voicing, not a new email.
- Keep the {{name}}, {{company}}, {{role}} and {{sender}} placeholders exactly as they are — they get filled in per recipient later. Do not resolve them, and do not invent new placeholders.
- Weave in the sender's background only where it fits naturally. Never invent facts about the sender beyond what they tell you; if they gave you little, keep it general rather than making things up.
- Plain text only. No markdown, no bullets, no subject line inside the body.
- Subject line under 70 characters.

Return JSON with exactly two string fields: "subject" and "body".`;

export function buildAdaptPrompt(input: AdaptInput): PromptParts {
  let user = `TEMPLATE: ${input.templateName}\n\n`;
  user += "TEMPLATE SUBJECT\n" + input.templateSubject.trim() + "\n\n";
  user += "TEMPLATE BODY\n" + input.templateBody.trim() + "\n\n";
  user += "SENDER\n";
  user += line("Name", input.senderName);
  user += line("Role they are targeting", input.role);
  user += line("Background they may draw on", input.senderBackground);
  user += `\nTONE\n${input.tone}\n`;
  return { system: ADAPT_SYSTEM, user };
}
