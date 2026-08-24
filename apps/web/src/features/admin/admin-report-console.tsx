"use client";

import type { AdminReportDetail, AdminReportSummary } from "@letterly/contracts/moderation";
import { useCallback, useEffect, useState } from "react";
import {
  getAdminReport,
  listAdminReports,
  mutateAdminReport,
  type WebApiError,
} from "../../lib/api-client";

type AdminReportConsoleProps = { reportId?: string };

type PendingMutation = {
  reportId: string;
  operation: "review" | "dismiss" | "reopen";
  expectedModerationVersion: number;
  reason: AdminReportDetail["reason"];
  idempotencyKey: string;
};

function errorText(error: unknown): string {
  return (error as WebApiError).message ?? "The administrator service is unavailable.";
}

export function AdminReportConsole({ reportId }: AdminReportConsoleProps): React.JSX.Element {
  const [items, setItems] = useState<AdminReportSummary[]>([]);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [status, setStatus] = useState<"OPEN" | "REVIEWED" | "DISMISSED" | "">("OPEN");
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null);

  const loadQueue = useCallback(async (next?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminReports({ status: status || undefined, cursor: next });
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setCursor(next);
    } catch (caught: unknown) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadDetail = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      setDetail(await getAdminReport(id));
    } catch (caught: unknown) {
      setError(errorText(caught));
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (reportId) void loadDetail(reportId);
  }, [loadDetail, reportId]);

  async function act(operation: "review" | "dismiss" | "reopen"): Promise<void> {
    if (!detail || mutating) return;
    const pending =
      pendingMutation &&
      pendingMutation.reportId === detail.id &&
      pendingMutation.operation === operation &&
      pendingMutation.expectedModerationVersion === detail.moderationVersion &&
      pendingMutation.reason === detail.reason
        ? pendingMutation
        : {
            reportId: detail.id,
            operation,
            expectedModerationVersion: detail.moderationVersion,
            reason: detail.reason,
            idempotencyKey: crypto.randomUUID(),
          };
    setPendingMutation(pending);
    setMutating(true);
    setError(null);
    try {
      await mutateAdminReport(detail.id, operation, {
        confirm: true,
        expectedModerationVersion: detail.moderationVersion,
        reason: detail.reason,
        idempotencyKey: pending.idempotencyKey,
      });
      setPendingMutation(null);
      await loadDetail(detail.id);
      await loadQueue(cursor);
    } catch (caught: unknown) {
      if ((caught as WebApiError).code === "STALE_MODERATION_VERSION") {
        setPendingMutation(null);
        await loadDetail(detail.id);
      }
      setError(errorText(caught));
    } finally {
      setMutating(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-5 py-9 text-ink sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-large border border-border bg-surface p-6 shadow-low" aria-labelledby="admin-reports-title">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Administration</p>
          <h1 id="admin-reports-title" className="mt-2 font-display text-4xl font-semibold tracking-tight">Report queue</h1>
          <label className="mt-6 block text-small font-semibold" htmlFor="report-status">Filter by status</label>
          <select id="report-status" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 text-small" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="">All reports</option><option value="OPEN">Open</option><option value="REVIEWED">Reviewed</option><option value="DISMISSED">Dismissed</option>
          </select>
          {error ? <p className="mt-4 rounded-medium border border-rose bg-surface-muted px-4 py-3 text-small text-wine" role="alert">{error}</p> : null}
          {loading ? <p className="mt-6 text-small text-ink-muted" role="status">Loading reports…</p> : null}
          {!loading && items.length === 0 ? <p className="mt-6 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">No reports match this filter.</p> : null}
          <ul className="mt-6 space-y-3" aria-label="Reports">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className="w-full rounded-medium border border-border bg-surface-muted p-4 text-left hover:border-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose" onClick={() => void loadDetail(item.id)}>
                  <span className="flex items-center justify-between gap-3 text-small font-semibold"><span>{item.reason.replaceAll("_", " ")}</span><span className="text-label uppercase text-ink-muted">{item.status}</span></span>
                  <span className="mt-2 block text-small text-ink-muted">Page {item.pageId}</span>
                  <span className="mt-1 block text-label text-ink-muted">{new Date(item.createdAt).toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
          {nextCursor ? <button type="button" className="mt-5 min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine" onClick={() => void loadQueue(nextCursor)}>Load more</button> : null}
        </section>
        <section className="rounded-large border border-border bg-surface p-6 shadow-low" aria-labelledby="admin-detail-title">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Review</p>
          <h2 id="admin-detail-title" className="mt-2 font-display text-3xl font-semibold tracking-tight">Report detail</h2>
          {!detail ? <p className="mt-6 text-body text-ink-muted">Choose a report to review its safe moderation history.</p> : (
            <div className="mt-6 space-y-6">
              <dl className="grid gap-4 text-small sm:grid-cols-2"><div><dt className="font-semibold text-ink-muted">Reason</dt><dd className="mt-1">{detail.reason.replaceAll("_", " ")}</dd></div><div><dt className="font-semibold text-ink-muted">Status</dt><dd className="mt-1">{detail.status}</dd></div><div><dt className="font-semibold text-ink-muted">Page</dt><dd className="mt-1 break-all">{detail.pageId}</dd></div><div><dt className="font-semibold text-ink-muted">Creator</dt><dd className="mt-1 break-all">{detail.creatorId}</dd></div></dl>
              {detail.message ? <p className="rounded-medium border border-border bg-surface-muted p-4 text-body whitespace-pre-wrap">{detail.message}</p> : null}
              <div className="flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-medium bg-wine px-4 py-3 text-small font-bold text-surface disabled:opacity-60" disabled={mutating} onClick={() => void act("review")}>Mark reviewed</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold disabled:opacity-60" disabled={mutating} onClick={() => void act("dismiss")}>Dismiss</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold disabled:opacity-60" disabled={mutating} onClick={() => void act("reopen")}>Reopen</button></div>
              <div><h3 className="font-display text-2xl font-semibold">Moderation history</h3><ol className="mt-4 space-y-3">{detail.actions.map((action) => <li key={action.id} className="rounded-medium border border-border bg-surface-muted p-4 text-small"><p className="font-semibold">{action.actionType.replaceAll("_", " ")}</p><p className="mt-1 text-ink-muted">{new Date(action.createdAt).toLocaleString()}</p>{action.note ? <p className="mt-2">{action.note}</p> : null}</li>)}</ol></div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
