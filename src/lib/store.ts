"use client";

import { create } from "zustand";
import { env } from "../env";
import { persist, createJSONStorage } from "zustand/middleware";
import { deriveCompany, deriveName } from "./derive";
import { DEFAULT_TEMPLATE } from "./template";
import type { GmailSession, Lead, Settings, Template } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  providerId: "gemini",
  model: "",
  apiKey: "",
  transport: "direct",
  googleClientId: "",
  concurrency: 3,
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeLead(email = "", overrides: Partial<Lead> = {}): Lead {
  const trimmed = email.trim().toLowerCase();
  const guess = deriveName(trimmed);
  return {
    id: newId(),
    email: trimmed,
    name: guess.name,
    company: deriveCompany(trimmed),
    role: "",
    notes: "",
    subject: "",
    body: "",
    status: "new",
    edited: {},
    nameConfidence: guess.confidence,
    ...overrides,
  };
}

interface AppState {
  leads: Lead[];
  template: Template;
  settings: Settings;

  addLeads: (emails: string[]) => number;
  addBlankRow: () => string;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  patchLeads: (ids: string[], patch: Partial<Lead>) => void;
  replaceLeads: (leads: Lead[]) => void;
  removeLeads: (ids: string[]) => void;
  clearGenerated: (ids: string[]) => void;
  setTemplate: (patch: Partial<Template>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

/**
 * `edited` records which guessed fields the user has corrected, so changing an
 * address re-derives the rest without stomping on anything they typed.
 */
function applyLeadPatch(lead: Lead, patch: Partial<Lead>): Lead {
  const next: Lead = { ...lead, ...patch, updatedAt: Date.now() };

  if (patch.name !== undefined && patch.name !== lead.name) {
    next.edited = { ...next.edited, name: true };
    next.nameConfidence = patch.name.trim() ? "high" : "none";
  }
  if (patch.company !== undefined && patch.company !== lead.company) {
    next.edited = { ...next.edited, company: true };
  }

  if (patch.email !== undefined && patch.email !== lead.email) {
    const email = patch.email.trim().toLowerCase();
    next.email = email;
    if (!next.edited.name) {
      const guess = deriveName(email);
      next.name = guess.name;
      next.nameConfidence = guess.confidence;
    }
    if (!next.edited.company) {
      next.company = deriveCompany(email);
    }
  }

  return next;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      leads: [],
      template: DEFAULT_TEMPLATE,
      settings: DEFAULT_SETTINGS,

      addLeads(emails) {
        const existing = new Set(get().leads.map((lead) => lead.email).filter(Boolean));
        const fresh = emails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email && !existing.has(email))
          .filter((email, index, all) => all.indexOf(email) === index)
          .map((email) => makeLead(email));

        if (fresh.length === 0) return 0;
        // Drop a trailing blank row so imports do not leave a gap.
        set((state) => {
          const leads = [...state.leads];
          const last = leads.at(-1);
          if (last && !last.email.trim() && !last.body.trim()) leads.pop();
          return { leads: [...leads, ...fresh] };
        });
        return fresh.length;
      },

      addBlankRow() {
        const lead = makeLead();
        set((state) => ({ leads: [...state.leads, lead] }));
        return lead.id;
      },

      updateLead(id, patch) {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id ? applyLeadPatch(lead, patch) : lead,
          ),
        }));
      },

      patchLeads(ids, patch) {
        const target = new Set(ids);
        set((state) => ({
          leads: state.leads.map((lead) =>
            target.has(lead.id) ? applyLeadPatch(lead, patch) : lead,
          ),
        }));
      },

      replaceLeads(leads) {
        set({ leads });
      },

      removeLeads(ids) {
        const target = new Set(ids);
        set((state) => ({ leads: state.leads.filter((lead) => !target.has(lead.id)) }));
      },

      clearGenerated(ids) {
        const target = new Set(ids);
        set((state) => ({
          leads: state.leads.map((lead) =>
            target.has(lead.id)
              ? { ...lead, subject: "", body: "", status: "new", error: undefined }
              : lead,
          ),
        }));
      },

      setTemplate(patch) {
        set((state) => ({ template: { ...state.template, ...patch } }));
      },

      setSettings(patch) {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
      },

      resetAll() {
        set({ leads: [], template: DEFAULT_TEMPLATE, settings: DEFAULT_SETTINGS });
      },
    }),
    {
      name: "mailsheet.workspace.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ leads, template, settings }) => ({ leads, template, settings }),
      // Runs synchronously inside create(), so it must not reach for `useApp`
      // — that binding does not exist yet.
      onRehydrateStorage: () => (state) => {
        // Nothing should look mid-flight after a reload.
        if (!state) return;
        state.leads = state.leads.map((lead) =>
          lead.status === "generating" || lead.status === "queued"
            ? { ...lead, status: lead.body ? "ready" : "new" }
            : lead,
        );
      },
    },
  ),
);

interface GmailState {
  session: GmailSession | null;
  setSession: (session: GmailSession | null) => void;
}

/** Kept in its own key so clearing the workspace does not sign you out. */
export const useGmail = create<GmailState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
    }),
    {
      name: "mailsheet.gmail.v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function resolveClientId(settings: Settings): string {
  return settings.googleClientId.trim() || env.googleClientId;
}

/**
 * Hydration signal for `useSyncExternalStore`. Defined at module scope so the
 * identities stay stable across renders, and so the server snapshot is always
 * `false` — the server has no localStorage, and rendering restored rows there
 * would be a hydration mismatch.
 */
export const hydrationStore = {
  subscribe: (onChange: () => void) => useApp.persist.onFinishHydration(onChange),
  getSnapshot: () => useApp.persist.hasHydrated(),
  getServerSnapshot: () => false,
};
