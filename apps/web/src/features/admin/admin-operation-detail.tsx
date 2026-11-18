"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import {
  adminPageParamsSchema,
  adminAppealParamsSchema,
  type AdminPageRecord,
  type AdminAppealDetail,
} from "@letterly/contracts/admin-operations";
import { getAdminPage, getAdminAppeal } from "./operations-api";
import { AdminActionPanel } from "./admin-action-panel";
import { AdminDate, adminTargetHref } from "./admin-directory";
import { humanize } from "./moderation-presentation";
import { WebApiError } from "@/lib/api/errors";
import styles from "./admin-theme.module.css";
import {
  AdminPageDeletion,
  RetainedDeletionLookup,
} from "./admin-page-deletion";

export function AdminOperationDetail({
  kind,
  id,
}: {
  kind: "page" | "appeal";
  id: string;
}) {
  const valid =
    kind === "page"
      ? adminPageParamsSchema.safeParse({ pageId: id }).success
      : adminAppealParamsSchema.safeParse({ appealId: id }).success;
  const query = useQuery<AdminPageRecord | AdminAppealDetail>({
    queryKey: [kind === "page" ? "admin-page" : "admin-appeal", id],
    queryFn: ({ signal }) =>
      kind === "page"
        ? getAdminPage(id, { signal })
        : getAdminAppeal(id, { signal }),
    enabled: valid,
  });
  const item = query.data;
  const unavailable =
    !valid ||
    (query.error instanceof WebApiError && query.error.statusCode === 404);
  const targetType =
    item && "slug" in item
      ? "PAGE"
      : item && "targetType" in item
        ? item.targetType
        : null;
  const targetId =
    item && "slug" in item
      ? item.id
      : item && "targetId" in item
        ? item.targetId
        : null;
  const targetHref = adminTargetHref(targetType, targetId);
  const base = kind === "page" ? "/admin/pages" : "/admin/moderation/appeals";
  return (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 md:p-6 lg:p-8"
    >
      <header>
        <Link
          href={base}
          className="mb-3 inline-flex min-h-11 items-center text-wine underline"
        >
          {kind === "page" ? "Page management" : "Appeal inbox"}
        </Link>
        <h1 tabIndex={-1} className="text-3xl font-semibold">
          {kind === "page" ? "Page details" : "Appeal details"}
        </h1>
        <p className="mt-2 text-ink-muted">
          {kind === "page"
            ? "Review publication details and moderation actions."
            : "Review the support reference, target, and recorded decision."}
        </p>
      </header>
      {unavailable ? (
        <section className={styles.panel} role="status">
          <h2 className="text-xl font-semibold">Record unavailable</h2>
          <p className="mt-3">No record is available for this ID.</p>
          {kind === "page" && valid ? (
            <RetainedDeletionLookup pageId={id} />
          ) : null}
        </section>
      ) : query.error ? (
        <section className={styles.panel} role="alert">
          <h2 className="text-xl font-semibold">Could not load this record</h2>
          <Button
            className="mt-4"
            onClick={() => void query.refetch()}
            loading={query.isFetching}
          >
            Retry record
          </Button>
        </section>
      ) : !item ? (
        <section className={styles.panel} role="status" aria-busy="true">
          Loading record…
        </section>
      ) : (
        <>
          <section
            className={styles.panel}
            aria-labelledby="record-metadata-title"
          >
            <h2 id="record-metadata-title" className="text-xl font-semibold">
              {"slug" in item ? item.slug : humanize(item.status)}
            </h2>
            <dl className={`${styles.facts} mt-6`}>
              <div>
                <dt>ID</dt>
                <dd className="break-all">{item.id}</dd>
              </div>
              <div>
                <dt>Moderation version</dt>
                <dd>{item.moderationVersion}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>
                  <AdminDate value={item.createdAt} />
                </dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  <AdminDate value={item.updatedAt} />
                </dd>
              </div>
              {"slug" in item ? (
                <>
                  <div>
                    <dt>Publication state</dt>
                    <dd>{humanize(item.status)}</dd>
                  </div>
                  <div>
                    <dt>Moderation state</dt>
                    <dd>{humanize(item.moderationStatus)}</dd>
                  </div>
                  <div>
                    <dt>Template</dt>
                    <dd>
                      {item.templateKey}, version {item.templateVersion}
                    </dd>
                  </div>
                  <div>
                    <dt>Creator ID</dt>
                    <dd>
                      <Link
                        className="inline-flex min-h-11 items-center break-all text-wine underline"
                        href={`/admin/creators/${encodeURIComponent(item.creatorId)}`}
                      >
                        {item.creatorId}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Published</dt>
                    <dd>
                      <AdminDate value={item.publishedAt} />
                    </dd>
                  </div>
                  <div>
                    <dt>Disabled</dt>
                    <dd>
                      <AdminDate value={item.disabledAt} />
                    </dd>
                  </div>
                  <div>
                    <dt>Reports</dt>
                    <dd>
                      <Link
                        className="inline-flex min-h-11 items-center text-wine underline"
                        href={`/admin/moderation/reports?pageId=${item.id}`}
                      >
                        {item.reportCount} reports
                      </Link>
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Support reference</dt>
                    <dd className="break-all">{item.externalReference}</dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{humanize(item.reasonCode)}</dd>
                  </div>
                  <div>
                    <dt>Original action ID</dt>
                    <dd className="break-all">
                      <a
                        className="inline-flex min-h-11 items-center text-wine underline"
                        href={`#action-${item.originalActionId}`}
                      >
                        {item.originalActionId}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>
                      {targetHref ? (
                        <Link
                          className="inline-flex min-h-11 items-center break-all text-wine underline"
                          href={targetHref}
                        >
                          {humanize(item.targetType ?? "")} {item.targetId}
                        </Link>
                      ) : (
                        "Unavailable"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolved</dt>
                    <dd>
                      <AdminDate value={item.resolvedAt} />
                    </dd>
                  </div>
                  <div>
                    <dt>Resolved by</dt>
                    <dd className="break-all">
                      {item.resolvedById ?? "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolution reason</dt>
                    <dd>
                      {item.resolutionReasonCode
                        ? humanize(item.resolutionReasonCode)
                        : "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolution note</dt>
                    <dd className="whitespace-pre-wrap">
                      {item.resolutionNote ?? "Not recorded"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap gap-4">
              {targetType && targetId ? (
                <Link
                  className="inline-flex min-h-11 items-center text-wine underline"
                  href={`/admin/moderation/audit?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`}
                >
                  View target audit history
                </Link>
              ) : null}
              {kind === "appeal" ? (
                <Link
                  className="inline-flex min-h-11 items-center text-wine underline"
                  href={`/admin/moderation/audit?targetType=APPEAL&targetId=${id}`}
                >
                  View appeal audit history
                </Link>
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center text-wine underline"
                  href={`/admin/moderation/appeals?targetType=PAGE&targetId=${id}`}
                >
                  View page appeals
                </Link>
              )}
            </div>
          </section>
          {"originalActionId" in item ? (
            <section
              id={`action-${item.originalActionId}`}
              className={styles.panel}
              aria-labelledby="original-action-title"
            >
              <h2 id="original-action-title" className="text-lg font-semibold">
                Original moderation action
              </h2>
              <p className="mt-3 break-all">
                Action ID: {item.originalActionId}
              </p>
              <p className="mt-2 break-all">
                Target:{" "}
                {item.targetType ? humanize(item.targetType) : "Unavailable"}{" "}
                {item.targetId}
              </p>
              {targetType && targetId ? (
                <Link
                  className="mt-3 inline-flex min-h-11 items-center text-wine underline"
                  href={`/admin/moderation/audit?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`}
                >
                  Review original target history
                </Link>
              ) : null}
            </section>
          ) : null}
          <AdminActionPanel
            deleting={
              "deletionRequestedAt" in item && !!item.deletionRequestedAt
            }
            kind={kind}
            id={id}
            version={item.moderationVersion}
            state={
              "moderationStatus" in item ? item.moderationStatus : item.status
            }
          />
          {"slug" in item ? <AdminPageDeletion page={item} /> : null}
        </>
      )}
    </main>
  );
}
