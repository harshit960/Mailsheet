"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { generate, getProvider } from "@/lib/ai";
import { downloadCsv, toCsv } from "@/lib/csv";
import { isEmail } from "@/lib/derive";
import {
  connectGmail,
  createDraft,
  disconnectGmail,
  draftsUrl,
  GmailError,
  isExpired,
} from "@/lib/gmail";
import { runPool } from "@/lib/runner";
import { hydrationStore, resolveClientId, useApp, useGmail } from "@/lib/store";
import { leadVars, render } from "@/lib/template";
import type { Lead } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { ImportDialog } from "@/components/ImportDialog";
import { Inspector } from "@/components/Inspector";
import { LeadGrid } from "@/components/LeadGrid";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TemplateDialog } from "@/components/TemplateDialog";
import { Toolbar } from "@/components/Toolbar";

type Toast = { text: string; tone: "info" | "error" } | null;

export default function Page() {
  const leads = useApp((state) => state.leads);
  const template = useApp((state) => state.template);
  const settings = useApp((state) => state.settings);
  const updateLead = useApp((state) => state.updateLead);
  const addBlankRow = useApp((state) => state.addBlankRow);
  const removeLeads = useApp((state) => state.removeLeads);

  const session = useGmail((state) => state.session);
  const setSession = useGmail((state) => state.setSession);

  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"settings" | "template" | "import" | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [running, setRunning] = useState<"write" | "draft" | null>(null);
  const [gmailBusy, setGmailBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Rows come out of localStorage, which the server cannot see, so the first
  // paint has to wait for the store to say it has restored them.
  const hydrated = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );

  const provider = getProvider(settings.providerId);
  const hasKey = settings.apiKey.trim().length > 0;
  const gmailReady = Boolean(session) && !isExpired(session);
  const activeLead = leads.find((lead) => lead.id === activeId) ?? null;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** A stale token should not look connected. */
  useEffect(() => {
    if (session && isExpired(session)) setSession(null);
  }, [session, setSession]);

  const scoped = useMemo(
    () => (selected.size > 0 ? leads.filter((lead) => selected.has(lead.id)) : leads),
    [leads, selected],
  );
  const writable = useMemo(
    () => scoped.filter((lead) => isEmail(lead.email)),
    [scoped],
  );
  const draftable = useMemo(
    () => scoped.filter((lead) => isEmail(lead.email) && lead.body.trim()),
    [scoped],
  );

  const say = useCallback((text: string, tone: "info" | "error" = "info") => {
    setToast({ text, tone });
  }, []);

  // ---- writing ----------------------------------------------------------

  const writeOne = useCallback(
    async (lead: Lead, signal: AbortSignal) => {
      updateLead(lead.id, { status: "generating", error: undefined });

      // Without a key we still fill the template locally; it is the same email
      // everyone gets, which is exactly what the model is there to avoid.
      if (!hasKey) {
        const vars = leadVars(lead, template);
        updateLead(lead.id, {
          subject: render(template.subject, vars).trim(),
          body: render(template.body, vars).trim(),
          status: "ready",
          error: undefined,
        });
        return;
      }

      try {
        const result = await generate({
          providerId: settings.providerId,
          model: settings.model,
          apiKey: settings.apiKey.trim(),
          transport: settings.transport,
          signal,
          input: {
            email: lead.email,
            name: lead.name,
            nameIsGuess: lead.nameConfidence === "low",
            company: lead.company,
            role: lead.role.trim() || template.role,
            notes: lead.notes,
            tone: template.tone,
            senderName: template.senderName,
            senderBackground: template.senderBackground,
            templateSubject: template.subject,
            templateBody: template.body,
          },
        });
        updateLead(lead.id, {
          subject: result.subject,
          body: result.body,
          status: "ready",
          error: undefined,
        });
      } catch (error) {
        if (signal.aborted) {
          updateLead(lead.id, { status: lead.body ? "ready" : "new" });
          return;
        }
        updateLead(lead.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Generation failed",
        });
      }
    },
    [hasKey, settings, template, updateLead],
  );

  async function runWrite() {
    if (writable.length === 0 || running) return;
    if (!template.body.trim()) {
      setDialog("template");
      say("Write a template first — every row is a rewrite of it.", "error");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning("write");
    const targets = writable;
    targets.forEach((lead) => updateLead(lead.id, { status: "queued" }));

    try {
      await runPool(targets, settings.concurrency, (lead) =>
        writeOne(lead, controller.signal),
      );
      if (!controller.signal.aborted) {
        const failed = useApp
          .getState()
          .leads.filter(
            (lead) => targets.some((t) => t.id === lead.id) && lead.status === "error",
          ).length;
        say(
          hasKey
            ? failed
              ? `Wrote ${targets.length - failed} of ${targets.length}. ${failed} failed — see the Status column.`
              : `Wrote ${targets.length} ${targets.length === 1 ? "email" : "emails"}.`
            : `Filled ${targets.length} from your template. Add an API key in Settings to personalise each one.`,
          failed ? "error" : "info",
        );
      }
    } finally {
      setRunning(null);
      abortRef.current = null;
    }
  }

  // ---- drafting ---------------------------------------------------------

  async function runDraft(only?: Lead) {
    const targets = only ? [only] : draftable;
    if (targets.length === 0 || running) return;
    if (!session || isExpired(session)) {
      setSession(null);
      say("Gmail session expired — connect again.", "error");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning("draft");
    let created = 0;
    let reauth = false;

    try {
      await runPool(targets, 2, async (lead) => {
        if (controller.signal.aborted || reauth) return;
        try {
          const vars = leadVars(lead, template);
          const subject =
            lead.subject.trim() || render(template.subject, vars).trim() || "Hello";
          const { draftId } = await createDraft(
            session,
            { to: lead.email, subject, body: lead.body },
            controller.signal,
          );
          updateLead(lead.id, { status: "drafted", draftId, error: undefined });
          created += 1;
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof GmailError && error.needsReauth) {
            reauth = true;
            controller.abort();
          }
          updateLead(lead.id, {
            status: "error",
            error: error instanceof Error ? error.message : "Draft failed",
          });
        }
      });

      if (reauth) {
        setSession(null);
        say("Gmail rejected the session — connect again.", "error");
      } else if (!controller.signal.aborted) {
        const failed = targets.length - created;
        say(
          failed
            ? `Created ${created} of ${targets.length} drafts. ${failed} failed.`
            : `Created ${created} ${created === 1 ? "draft" : "drafts"} in Gmail.`,
          failed ? "error" : "info",
        );
      }
    } finally {
      setRunning(null);
      abortRef.current = null;
    }
  }

  // ---- gmail ------------------------------------------------------------

  async function onConnectGmail() {
    const clientId = resolveClientId(settings);
    if (!clientId) {
      setDialog("settings");
      say("Add a Google OAuth client ID in Settings to create drafts.", "error");
      return;
    }
    setGmailBusy(true);
    try {
      setSession(await connectGmail(clientId));
    } catch (error) {
      say(error instanceof Error ? error.message : "Could not connect Gmail", "error");
    } finally {
      setGmailBusy(false);
    }
  }

  function onDisconnectGmail() {
    disconnectGmail(session);
    setSession(null);
    say("Disconnected from Gmail.");
  }

  // ---- rows -------------------------------------------------------------

  function onAddRow() {
    const id = addBlankRow();
    setActiveId(id);
  }

  function onDelete() {
    const ids = [...selected];
    removeLeads(ids);
    if (activeId && selected.has(activeId)) setActiveId(null);
    setSelected(new Set());
    say(`Deleted ${ids.length} ${ids.length === 1 ? "row" : "rows"}.`);
  }

  function onExport() {
    downloadCsv(`mailsheet-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(leads));
  }

  if (!hydrated) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <p className="text-[12.5px] text-ink-3">Loading your workspace…</p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <Header
        hasKey={hasKey}
        providerLabel={provider.label}
        gmailEmail={gmailReady ? session?.email || "Gmail connected" : null}
        gmailBusy={gmailBusy}
        onOpenTemplate={() => setDialog("template")}
        onOpenSettings={() => setDialog("settings")}
        onConnectGmail={onConnectGmail}
        onDisconnectGmail={onDisconnectGmail}
      />

      <Toolbar
        total={leads.length}
        selectedCount={selected.size}
        writableCount={writable.length}
        draftableCount={draftable.length}
        running={running !== null}
        hasKey={hasKey}
        gmailReady={gmailReady}
        onAddRow={onAddRow}
        onImport={() => setDialog("import")}
        onGenerate={runWrite}
        onDraft={() => runDraft()}
        onStop={() => abortRef.current?.abort()}
        onExport={onExport}
        onDelete={onDelete}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {leads.length === 0 ? (
            <EmptyState
              hasTemplate={Boolean(template.body.trim() && template.senderName.trim())}
              hasKey={hasKey}
              onImport={() => setDialog("import")}
              onOpenTemplate={() => setDialog("template")}
              onOpenSettings={() => setDialog("settings")}
            />
          ) : (
            <LeadGrid
              leads={leads}
              selected={selected}
              onSelectedChange={setSelected}
              activeId={activeId}
              onActivate={setActiveId}
              onEdit={updateLead}
            />
          )}
        </div>

        {activeLead ? (
          <div className="absolute inset-0 z-20 bg-canvas lg:static lg:inset-auto lg:z-auto lg:w-[400px] lg:flex-none">
            <Inspector
              lead={activeLead}
              onChange={(patch) => updateLead(activeLead.id, patch)}
              onClose={() => setActiveId(null)}
              onGenerate={() => {
                const controller = new AbortController();
                abortRef.current = controller;
                void writeOne(activeLead, controller.signal);
              }}
              onDraft={() => void runDraft(activeLead)}
              hasKey={hasKey}
              gmailReady={gmailReady}
              draftsHref={draftsUrl(session?.email ?? "")}
            />
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
        >
          <p
            className="pointer-events-auto max-w-[520px] rounded-md border px-3.5 py-2 text-[12.5px] leading-relaxed shadow-lg"
            style={{
              background: "var(--color-surface)",
              borderColor:
                toast.tone === "error" ? "var(--color-danger)" : "var(--color-line-2)",
              color: toast.tone === "error" ? "var(--color-danger)" : "var(--color-ink)",
            }}
          >
            {toast.text}
          </p>
        </div>
      ) : null}

      <SettingsDialog open={dialog === "settings"} onClose={() => setDialog(null)} />
      <TemplateDialog open={dialog === "template"} onClose={() => setDialog(null)} />
      <ImportDialog
        open={dialog === "import"}
        onClose={() => setDialog(null)}
        onImported={(added, skipped) =>
          say(
            skipped
              ? `Added ${added}. Skipped ${skipped} already in the sheet.`
              : `Added ${added} ${added === 1 ? "row" : "rows"}.`,
          )
        }
      />
    </main>
  );
}
