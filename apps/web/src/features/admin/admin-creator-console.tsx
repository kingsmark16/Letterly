"use client";

import {
  adminCreatorIdSchema,
  type AdminCreatorDetail,
} from "@letterly/contracts/moderation";
import { Button } from "@repo/ui/button";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { WebApiError } from "@/lib/api/errors";
import { getAdminCreator } from "./api";
import { AdminAccessNotice } from "./admin-access-notice";
import { AdminDirectory } from "./admin-directory";
import { AdminActionPanel } from "./admin-action-panel";
import {
  AdminPageDeletion,
  RetainedDeletionLookup,
} from "./admin-page-deletion";
import styles from "./admin-theme.module.css";

function DateValue({ value }: { value: string | null }) {
  if (!value) return <>Not recorded</>;
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value))}{" "}
      UTC
    </time>
  );
}

function CreatorRecord({ creator }: { creator: AdminCreatorDetail }) {
  return (
    <>
      <section
        className={styles.panel}
        aria-labelledby="creator-identity-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">Creator account</p>
            <h2
              id="creator-identity-title"
              className="mt-1 break-words text-2xl font-semibold"
            >
              {creator.name || "Unnamed creator"}
            </h2>
            <p className="mt-2 break-all text-ink-muted">{creator.email}</p>
          </div>
          <span className="rounded-md border border-border px-3 py-2 text-sm font-semibold">
            {creator.moderationStatus === "ACTIVE" ? "Active" : "Disabled"}
          </span>
        </div>
        <dl className={`${styles.facts} mt-8`}>
          <div>
            <dt>Creator ID</dt>
            <dd className="break-all">{creator.id}</dd>
          </div>
          <div>
            <dt>Account role</dt>
            <dd>{creator.role === "ADMIN" ? "Administrator" : "Creator"}</dd>
          </div>
          <div>
            <dt>Owned pages</dt>
            <dd className="text-2xl font-semibold">{creator.pageCount}</dd>
          </div>
          <div>
            <dt>Moderation version</dt>
            <dd>{creator.moderationVersion}</dd>
          </div>
        </dl>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className={styles.panel} aria-labelledby="creator-dates-title">
          <h2 id="creator-dates-title" className="text-lg font-semibold">
            Account history
          </h2>
          <dl className={`${styles.facts} mt-6`}>
            <div>
              <dt>Created</dt>
              <dd>
                <DateValue value={creator.createdAt} />
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                <DateValue value={creator.updatedAt} />
              </dd>
            </div>
            <div>
              <dt>Disabled</dt>
              <dd>
                <DateValue value={creator.disabledAt} />
              </dd>
            </div>
            <div>
              <dt>Disabled reason</dt>
              <dd>{creator.disabledReason ?? "Not recorded"}</dd>
            </div>
          </dl>
          <Link
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-wine underline"
            href={`/admin/moderation/audit?targetType=USER&targetId=${encodeURIComponent(creator.id)}`}
          >
            View account audit history
          </Link>
        </section>
        <section
          className={styles.panel}
          aria-labelledby="creator-boundaries-title"
        >
          <h2 id="creator-boundaries-title" className="text-lg font-semibold">
            Operational details only
          </h2>
          <p className="mt-3 text-ink-muted">
            This view contains account identity, dates, moderation state, and
            page counts. Private writing, responses, and uploaded files are not
            included.
          </p>
        </section>
      </div>
      <AdminActionPanel
        kind="user"
        id={creator.id}
        version={creator.moderationVersion}
        state={creator.moderationStatus}
        protectedTarget={creator.role === "ADMIN"}
        deleting={!!creator.deletionRequestedAt}
      />
      {creator.role === "CREATOR" ? (
        <AdminPageDeletion page={creator} targetType="CREATOR" />
      ) : null}
      <AdminDirectory kind="pages" creatorId={creator.id} embedded />
    </>
  );
}

export function AdminCreatorConsole({ creatorId }: { creatorId: string }) {
  const validId = adminCreatorIdSchema.safeParse(creatorId);
  const query = useQuery({
    queryKey: ["admin-creator", creatorId],
    queryFn: ({ signal }) => getAdminCreator(creatorId ?? "", { signal }),
    enabled: validId?.success === true,
    retry: false,
  });
  const error = query.error;
  if (
    error instanceof WebApiError &&
    (error.statusCode === 401 || error.statusCode === 403)
  ) {
    return (
      <AdminAccessNotice
        access={error.statusCode === 401 ? "unauthenticated" : "forbidden"}
      />
    );
  }
  return (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 md:p-6 lg:p-8"
    >
      <header>
        {creatorId ? (
          <Link
            className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-wine underline"
            href="/admin/creators"
          >
            Creator lookup
          </Link>
        ) : null}
        <h1 className="text-3xl font-semibold">
          {creatorId ? "Creator details" : "Creators"}
        </h1>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Find an account and inspect the metadata you need for administration.
        </p>
      </header>
      {!validId.success ||
      (error instanceof WebApiError && error.statusCode === 404) ? (
        <section className={styles.panel} role="status">
          <h2 className="text-xl font-semibold">Creator unavailable</h2>
          <p className="mt-3 text-ink-muted">
            No account record is available for this ID. Check the ID and try
            another lookup.
          </p>
          {validId.success ? (
            <RetainedDeletionLookup pageId={creatorId} targetType="CREATOR" />
          ) : null}
          <Link
            className="mt-4 inline-flex min-h-11 items-center text-wine underline"
            href="/admin/creators"
          >
            Find another creator
          </Link>
        </section>
      ) : error ? (
        <section className={styles.panel} role="alert">
          <h2 className="text-xl font-semibold">Could not load this creator</h2>
          <p className="mt-3 text-ink-muted">
            {error instanceof WebApiError && error.statusCode === 429
              ? "The request limit was reached. Wait a moment before trying again."
              : "The administrator service is unavailable. Your lookup has been kept so you can retry."}
          </p>
          <Button
            className="mt-5"
            onClick={() => void query.refetch()}
            loading={query.isFetching}
          >
            Retry lookup
          </Button>
        </section>
      ) : query.data ? (
        <CreatorRecord creator={query.data} />
      ) : (
        <section
          className={styles.panel}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <h2 className="text-xl font-semibold">Loading creator details</h2>
          <p className="mt-3 text-ink-muted">
            Reading the approved account metadata.
          </p>
        </section>
      )}
    </main>
  );
}
