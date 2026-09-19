/**
 * A shelf of starting points. Every template here is written from scratch for
 * this app — none is copied from anyone's site. Cold-email *wording* is
 * copyrighted; the underlying *patterns* (the referral ask, the break-up
 * nudge) are not, so each entry credits where its pattern is discussed as
 * further reading, not as the source of the text.
 *
 * Placeholders are the same four the rest of the app understands:
 * {{name}} {{company}} {{role}} {{sender}}. "Use as-is" drops one straight into
 * your working template; "Adapt to me" rewrites it in your voice first.
 */
import type { Tone } from "../types";

export interface TemplateSource {
  label: string;
  url: string;
}

export interface LibraryTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** One line: when this is the right template to reach for. */
  useWhen: string;
  tone: Tone;
  subject: string;
  body: string;
  /** Why the pattern works — shown under the preview. */
  whyItWorks: string;
  sources: TemplateSource[];
}

export const TEMPLATE_CATEGORIES = [
  "Applying",
  "Networking",
  "Following up",
  "After an interview",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/** Reused source references, so the same publication reads consistently. */
const SRC = {
  muse: { label: "The Muse — career advice", url: "https://www.themuse.com/advice" },
  hbr: { label: "Harvard Business Review", url: "https://hbr.org/" },
  hubspot: { label: "HubSpot sales blog", url: "https://blog.hubspot.com/sales" },
  yesware: { label: "Yesware blog", url: "https://www.yesware.com/blog/" },
  mailshake: { label: "Mailshake blog", url: "https://mailshake.com/blog/" },
  askamanager: { label: "Ask a Manager", url: "https://www.askamanager.org/" },
} satisfies Record<string, TemplateSource>;

export const TEMPLATE_LIBRARY: readonly LibraryTemplate[] = [
  {
    id: "cold-apply",
    name: "Direct application",
    category: "Applying",
    useWhen: "There is a specific opening and you are applying cold.",
    tone: "warm",
    subject: "{{role}} — application from {{sender}}",
    body: `Hi {{name}},

I'm writing about the {{role}} opening at {{company}}. I've spent the last few years doing exactly this kind of work, and it's the direction I want to keep building in.

I've attached my resume. If it's useful I'd be glad to walk through a couple of the projects most relevant to what your team is working on.

Would you be open to a short call this week or next?

Thanks for your time,
{{sender}}`,
    whyItWorks:
      "States the role in the first line, offers proof rather than adjectives, and asks for one small, specific next step instead of 'let me know'.",
    sources: [SRC.muse, SRC.askamanager],
  },
  {
    id: "no-opening",
    name: "No posted opening",
    category: "Applying",
    useWhen: "You want to work there but there is no listed role.",
    tone: "warm",
    subject: "Interested in what {{company}} is building",
    body: `Hi {{name}},

I know you may not have an open {{role}} role right now, so no worries if the timing is off. I wanted to reach out anyway because the work at {{company}} is the kind of thing I'd want to spend the next few years on.

I've attached a short resume. If it's ever worth a conversation — now or down the line — I'd welcome it.

Either way, thanks for reading.
{{sender}}`,
    whyItWorks:
      "Names the awkwardness (no opening) up front, which lowers the stakes, then leaves a door open without pressing. Speculative notes convert best when they ask for nothing urgent.",
    sources: [SRC.muse],
  },
  {
    id: "referral-ask",
    name: "Asking for a referral",
    category: "Applying",
    useWhen: "You already know the person, or share a real connection.",
    tone: "casual",
    subject: "Quick favour re: {{company}}",
    body: `Hi {{name}},

I'm applying for the {{role}} role at {{company}} and I remember you know the team there. Would you be comfortable referring me, or pointing me to whoever owns the hire?

Totally fine to say no — I know a referral puts your name on the line. If it helps, I'm happy to send a couple of lines you could paste, so it's no work on your end.

Thanks either way,
{{sender}}`,
    whyItWorks:
      "Gives the person an easy out, and offers to do the writing for them. The lower the effort you ask for, the more referrals you get.",
    sources: [SRC.hubspot, SRC.askamanager],
  },
  {
    id: "warm-intro",
    name: "Introduced by a mutual contact",
    category: "Networking",
    useWhen: "Someone connected you, or you can name a shared contact.",
    tone: "warm",
    subject: "{{sender}} — introduced via a mutual contact",
    body: `Hi {{name}},

We haven't met, but we have a connection in common who thought it was worth reaching out to you about the {{role}} work at {{company}}.

I won't take much of your time — I'd just value fifteen minutes to hear how you think about the team and where it's headed. Happy to work around your schedule.

Thanks,
{{sender}}`,
    whyItWorks:
      "Leads with the shared connection, which is the reason the email gets opened and answered. Keeps the ask to time, not a job.",
    sources: [SRC.hbr, SRC.muse],
  },
  {
    id: "coffee-chat",
    name: "Coffee chat / informational",
    category: "Networking",
    useWhen: "You want to learn, not to ask for a job yet.",
    tone: "warm",
    subject: "Fifteen minutes to hear about {{company}}?",
    body: `Hi {{name}},

I've been following the {{role}} space and {{company}} keeps coming up as a team doing it thoughtfully. I'm not writing to ask you for a job — I'd genuinely just like to understand how you got into it and what the work is really like.

Would you have fifteen minutes in the next couple of weeks? I'm happy to fit around whatever's easy for you.

Thanks,
{{sender}}`,
    whyItWorks:
      "Explicitly removes the job ask, which is what makes people say yes to a stranger. The relationship, not the immediate role, is the point.",
    sources: [SRC.hbr, SRC.muse],
  },
  {
    id: "alumni",
    name: "Alumni / shared background",
    category: "Networking",
    useWhen: "You share a school, past employer, or hometown.",
    tone: "casual",
    subject: "Fellow {{company}}-curious — quick hello",
    body: `Hi {{name}},

We haven't met, but we came up through the same background, and I've been meaning to reach out to people from it who ended up doing {{role}} work.

You landed somewhere I'd love to understand better. If you're open to it, I'd enjoy a short call to hear how you got to {{company}} and what you'd tell someone trying to do the same.

No worries at all if you're heads-down.
{{sender}}`,
    whyItWorks:
      "A shared background is a real reason to reply. Asking for the story, not a favour, makes it easy to say yes.",
    sources: [SRC.muse],
  },
  {
    id: "followup-nudge",
    name: "Follow-up #1 (gentle nudge)",
    category: "Following up",
    useWhen: "Three to five days after a first email with no reply.",
    tone: "direct",
    subject: "Re: {{role}} at {{company}}",
    body: `Hi {{name}},

Floating this back to the top of your inbox in case it slipped by. I know how these weeks go.

Still very interested in the {{role}} work at {{company}} — happy to make a call as easy as possible on your end, or to send anything that would help.

Thanks,
{{sender}}`,
    whyItWorks:
      "Short, assumes good faith ('slipped by', not 'you ignored me'), and repeats the one thing you want. Most replies to cold outreach come from the first follow-up, not the original.",
    sources: [SRC.yesware, SRC.mailshake],
  },
  {
    id: "followup-breakup",
    name: "Follow-up #2 (the break-up)",
    category: "Following up",
    useWhen: "Your last attempt after a couple of unanswered emails.",
    tone: "direct",
    subject: "Re: {{role}} at {{company}}",
    body: `Hi {{name}},

I don't want to keep landing in your inbox, so this is my last note on it. If the timing isn't right, I completely understand — no reply needed.

If it ever is right, I'd still love to talk about the {{role}} work at {{company}}. You know where to find me.

All the best,
{{sender}}`,
    whyItWorks:
      "The 'break-up' note often gets the reply the earlier ones didn't — it removes the pressure and gives a clean last chance. Say it's the last one and mean it.",
    sources: [SRC.hubspot, SRC.yesware],
  },
  {
    id: "reengage-stale",
    name: "Re-engaging an old thread",
    category: "Following up",
    useWhen: "You spoke months ago and want to reopen it.",
    tone: "warm",
    subject: "Circling back after a while",
    body: `Hi {{name}},

We spoke a while back about {{company}} and the timing wasn't right then. I've kept an eye on the team since, and I wanted to check whether anything has opened up around {{role}} work.

No expectations — just didn't want to let a good conversation go cold. Glad to pick it back up whenever suits.

Thanks,
{{sender}}`,
    whyItWorks:
      "Acknowledges the gap honestly and references the prior conversation, so it reads as continuity rather than a cold pitch.",
    sources: [SRC.mailshake],
  },
  {
    id: "recruiter-reply",
    name: "Replying to a recruiter",
    category: "Following up",
    useWhen: "A recruiter reached out and you want to keep it moving.",
    tone: "warm",
    subject: "Re: {{role}} at {{company}}",
    body: `Hi {{name}},

Thanks for reaching out about the {{role}} role — the timing is good and I'd like to learn more.

Before a call, it would help to know a bit about the team I'd be joining and what the first six months tend to look like. Happy to share more about my background too; a short resume is attached.

What does your calendar look like this week?
{{sender}}`,
    whyItWorks:
      "Says yes clearly, asks two useful questions so the first call isn't wasted, and proposes moving to scheduling. Warmth plus momentum.",
    sources: [SRC.muse],
  },
  {
    id: "thankyou",
    name: "Post-interview thank-you",
    category: "After an interview",
    useWhen: "Within a day of an interview.",
    tone: "warm",
    subject: "Thank you — {{role}} conversation",
    body: `Hi {{name}},

Thank you for the time today. I came away more interested in the {{role}} role at {{company}}, not less — the conversation about the team's priorities was genuinely useful.

One thing I've thought about since we spoke: I'd be glad to go deeper on it if it would help your decision. Either way, thanks for a thoughtful conversation.

Best,
{{sender}}`,
    whyItWorks:
      "Specific ('priorities', not 'great chat'), reaffirms interest, and offers one concrete follow-up. Sent within a day, it keeps you top of mind while the decision is fresh.",
    sources: [SRC.muse, SRC.askamanager],
  },
  {
    id: "after-rejection",
    name: "Staying in touch after a no",
    category: "After an interview",
    useWhen: "You were turned down but want to keep the door open.",
    tone: "formal",
    subject: "Thank you — and staying in touch",
    body: `Hi {{name}},

Thank you for letting me know about the {{role}} decision. I won't pretend I'm not disappointed, but I appreciated the process and the people I met at {{company}}.

If a similar role opens up down the line, I'd welcome the chance to be considered. I'll be rooting for the team in the meantime.

With thanks,
{{sender}}`,
    whyItWorks:
      "Graceful, honest, and forward-looking. Candidates who respond well to a rejection are the ones hiring managers remember when the next role opens.",
    sources: [SRC.askamanager, SRC.muse],
  },
];

export function templateById(id: string): LibraryTemplate | undefined {
  return TEMPLATE_LIBRARY.find((t) => t.id === id);
}
