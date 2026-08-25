"use client";

import type { AdminAuditEvent } from "@letterly/contracts/moderation";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { listAdminAuditEvents } from "../../lib/api-client";

type AuditTargetType = "PAGE" | "USER" | "REPORT" | "APPEAL" | "SYSTEM";
type AuditEventType =
  | "AUTH_SIGN_IN_SUCCEEDED"
  | "AUTH_SIGN_IN_DENIED"
  | "ADMIN_BOOTSTRAPPED"
  | "REPORT_CREATED"
  | "REPORT_REVIEWED"
  | "REPORT_DISMISSED"
  | "REPORT_REOPENED"
  | "PAGE_DISABLED"
  | "PAGE_RESTORED"
  | "USER_DISABLED"
  | "USER_RESTORED"
  | "APPEAL_CREATED"
  | "APPEAL_ACCEPTED"
  | "APPEAL_REJECTED"
  | "RETENTION_SUCCEEDED"
  | "RETENTION_FAILED";

const targetTypes: Array<{ value: AuditTargetType; label: string }> = [
  { value: "PAGE", label: "Page" },
  { value: "USER", label: "Creator" },
  { value: "REPORT", label: "Report" },
  { value: "APPEAL", label: "Appeal" },
  { value: "SYSTEM", label: "System" },
];

const eventTypes: Array<{ value: AuditEventType; label: string }> = [
  { value: "AUTH_SIGN_IN_SUCCEEDED", label: "Administrator sign in" },
  { value: "AUTH_SIGN_IN_DENIED", label: "Administrator sign in denied" },
  { value: "ADMIN_BOOTSTRAPPED", label: "Administrator bootstrapped" },
  { value: "REPORT_CREATED", label: "Report created" },
  { value: "REPORT_REVIEWED", label: "Report reviewed" },
  { value: "REPORT_DISMISSED", label: "Report dismissed" },
  { value: "REPORT_REOPENED", label: "Report reopened" },
  { value: "PAGE_DISABLED", label: "Page disabled" },
  { value: "PAGE_RESTORED", label: "Page restored" },
  { value: "USER_DISABLED", label: "Creator disabled" },
  { value: "USER_RESTORED", label: "Creator restored" },
  { value: "APPEAL_CREATED", label: "Appeal created" },
  { value: "APPEAL_ACCEPTED", label: "Appeal accepted" },
  { value: "APPEAL_REJECTED", label: "Appeal rejected" },
  { value: "RETENTION_SUCCEEDED", label: "Retention succeeded" },
  { value: "RETENTION_FAILED", label: "Retention failed" },
];

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/gu, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function updateAuditUrl(
  pathname: string,
  current: ReturnType<typeof useSearchParams>,
  changes: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  if (Object.keys(changes).length > 0) params.delete("cursor");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isTargetType(value: string | null): value is AuditTargetType {
  return targetTypes.some((item) => item.value === value);
}

function isEventType(value: string | null): value is AuditEventType {
  return eventTypes.some((item) => item.value === value);
}

function errorText(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "The audit service is unavailable. Please try again.";
}

export function AdminAuditConsole(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const targetTypeParam = searchParams.get("targetType");
  const eventTypeParam = searchParams.get("eventType");
  const targetType: AuditTargetType | undefined = isTargetType(targetTypeParam)
    ? targetTypeParam
    : undefined;
  const eventType: AuditEventType | undefined = isEventType(eventTypeParam)
    ? eventTypeParam
    : undefined;
  const targetFilter = searchParams.get("targetId") ?? undefined;
  const actorFilter = searchParams.get("actorId") ?? undefined;
  const [targetDraft, setTargetDraft] = useState(targetFilter ?? "");
  const [actorDraft, setActorDraft] = useState(actorFilter ?? "");

  const auditQuery = useInfiniteQuery({
    queryKey: ["admin-audit", targetType, eventType, targetFilter, actorFilter],
    queryFn: ({ pageParam }) =>
      listAdminAuditEvents({
        targetType,
        eventType,
        targetId: targetFilter,
        actorId: actorFilter,
        size: 20,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const events = useMemo<AdminAuditEvent[]>(
    () => auditQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [auditQuery.data],
  );

  function navigate(changes: Record<string, string | null>): void {
    router.replace(updateAuditUrl(pathname, searchParams, changes));
  }

  return (
    <main className="min-h-screen bg-canvas px-5 py-9 text-ink sm:px-8">
      <section className="mx-auto w-full max-w-7xl rounded-large border border-border bg-surface p-6 shadow-low sm:p-9" aria-labelledby="audit-title">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
          <div>
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Administration</p>
            <h1 id="audit-title" className="mt-2 font-display text-4xl font-semibold tracking-tight">Audit history</h1>
            <p className="mt-3 max-w-2xl text-body leading-relaxed text-ink-muted">Safe event metadata only. Letter content, responses, secrets, and raw network identity never appear here.</p>
          </div>
          <nav className="flex flex-wrap gap-3 text-small font-bold" aria-label="Administration navigation">
            <Link className="min-h-11 rounded-medium border border-border px-4 py-3 hover:border-wine hover:text-wine" href="/admin/moderation/reports">Reports</Link>
            <Link className="min-h-11 rounded-medium border border-wine bg-surface-muted px-4 py-3 text-wine" href="/admin/moderation/audit" aria-current="page">Audit history</Link>
          </nav>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
          <section className="rounded-large border border-border bg-surface-muted p-5" aria-labelledby="audit-filters-title">
            <h2 id="audit-filters-title" className="font-display text-2xl font-semibold">Filters</h2>
            <p className="mt-2 text-small leading-relaxed text-ink-muted">Filters stay in the URL so a review can be shared and resumed safely.</p>
            <div className="mt-5 grid gap-4">
              <label className="text-small font-semibold" htmlFor="audit-target-type">Target type<select id="audit-target-type" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3" value={targetType ?? ""} onChange={(event) => navigate({ targetType: event.target.value || null })}><option value="">All targets</option>{targetTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-small font-semibold" htmlFor="audit-event-type">Event<select id="audit-event-type" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3" value={eventType ?? ""} onChange={(event) => navigate({ eventType: event.target.value || null })}><option value="">All events</option>{eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="text-small font-semibold" htmlFor="audit-target-id">Target ID<input id="audit-target-id" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3" value={targetDraft} onChange={(event) => setTargetDraft(event.target.value)} /></label>
              <button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine" onClick={() => navigate({ targetId: targetDraft.trim() || null })}>Apply target filter</button>
              <label className="text-small font-semibold" htmlFor="audit-actor-id">Administrator ID<input id="audit-actor-id" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3" value={actorDraft} onChange={(event) => setActorDraft(event.target.value)} /></label>
              <button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine" onClick={() => navigate({ actorId: actorDraft.trim() || null })}>Apply administrator filter</button>
              <button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine" onClick={() => { setTargetDraft(""); setActorDraft(""); navigate({ targetType: null, eventType: null, targetId: null, actorId: null }); }}>Clear filters</button>
            </div>
          </section>

          <section aria-labelledby="audit-events-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="audit-events-title" className="font-display text-2xl font-semibold">Events</h2><p className="mt-1 text-small text-ink-muted">Newest events appear first.</p></div>
              <span className="text-label font-bold uppercase tracking-[0.12em] text-ink-muted">Private</span>
            </div>
            {auditQuery.isPending ? <p className="mt-6 text-small text-ink-muted" role="status">Loading audit events…</p> : null}
            {auditQuery.error ? <div className="mt-6 rounded-medium border border-rose bg-surface-muted p-4 text-small text-wine" role="alert"><p>{errorText(auditQuery.error)}</p><button type="button" className="mt-3 min-h-11 underline underline-offset-4" onClick={() => void auditQuery.refetch()}>Try again</button></div> : null}
            {!auditQuery.isPending && !auditQuery.error && events.length === 0 ? <p className="mt-6 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">No audit events match these filters.</p> : null}
            <ol className="mt-6 space-y-3">
              {events.map((event) => <li key={event.id} className="rounded-medium border border-border bg-surface-muted p-4 text-small"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">{humanize(event.eventType)}</span><span className="text-label uppercase text-ink-muted">{event.outcome}</span></div><p className="mt-2 text-ink-muted">{event.targetType ? humanize(event.targetType) : "System"}{event.targetId ? ` · ${event.targetId}` : ""}</p><p className="mt-1 text-label text-ink-muted">Administrator {event.actorId ?? "system"}</p><time className="mt-1 block text-label text-ink-muted" dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></li>)}
            </ol>
            {auditQuery.hasNextPage ? <button type="button" className="mt-5 min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={auditQuery.isFetchingNextPage} onClick={() => void auditQuery.fetchNextPage()}>{auditQuery.isFetchingNextPage ? "Loading…" : "Load more events"}</button> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
