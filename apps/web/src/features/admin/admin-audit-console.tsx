"use client";

import { useEffect, useState } from "react";
import type { AdminAuditEvent } from "@letterly/contracts/moderation";
import { listAdminAuditEvents, type WebApiError } from "../../lib/api-client";

export function AdminAuditConsole(): React.JSX.Element {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAdminAuditEvents()
      .then((result) => setEvents(result.items))
      .catch((caught: unknown) => setError((caught as WebApiError).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-canvas px-5 py-9 text-ink sm:px-8">
      <section className="mx-auto w-full max-w-5xl rounded-large border border-border bg-surface p-6 shadow-low sm:p-9" aria-labelledby="audit-title">
        <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Administration</p>
        <h1 id="audit-title" className="mt-2 font-display text-4xl font-semibold tracking-tight">Audit history</h1>
        <p className="mt-3 max-w-2xl text-body leading-relaxed text-ink-muted">Safe event metadata only. Letter content, responses, secrets, and raw network identity never appear here.</p>
        {loading ? <p className="mt-7 text-small text-ink-muted" role="status">Loading audit events…</p> : null}
        {error ? <p className="mt-7 rounded-medium border border-rose bg-surface-muted px-4 py-3 text-small text-wine" role="alert">{error}</p> : null}
        {!loading && !error && events.length === 0 ? <p className="mt-7 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">No audit events found.</p> : null}
        <ol className="mt-7 space-y-3">{events.map((event) => <li key={event.id} className="rounded-medium border border-border bg-surface-muted p-4 text-small"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">{event.eventType.replaceAll("_", " ")}</span><span className="text-label uppercase text-ink-muted">{event.outcome}</span></div><p className="mt-2 text-ink-muted">{event.targetType ?? "SYSTEM"}{event.targetId ? ` · ${event.targetId}` : ""}</p><p className="mt-1 text-label text-ink-muted">{new Date(event.createdAt).toLocaleString()}</p></li>)}</ol>
      </section>
    </main>
  );
}
