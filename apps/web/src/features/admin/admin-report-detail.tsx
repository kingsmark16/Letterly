"use client";

import type { AdminReportDetail } from "@letterly/contracts/moderation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  humanize,
  formatDate,
  reasons,
  type ReportOperation,
  type ReportReason,
} from "./moderation-presentation";

interface ReportDetailProps {
  detail: AdminReportDetail;
  mutating: boolean;
  appealMutating: boolean;
  onReportAction: (operation: ReportOperation) => void;
  onPageAction: (operation: "disable" | "restore") => void;
  onUserAction: (operation: "disable" | "restore") => void;
  onAppealAction: (operation: "accept" | "reject") => void;
  appealReference: string;
  appealReason: ReportReason;
  onAppealReferenceChange: (value: string) => void;
  onAppealReasonChange: (value: ReportReason) => void;
  onCreateAppeal: () => void;
}

export function ReportDetail({
  detail,
  mutating,
  appealMutating,
  onReportAction,
  onPageAction,
  onUserAction,
  onAppealAction,
  appealReference,
  appealReason,
  onAppealReferenceChange,
  onAppealReasonChange,
  onCreateAppeal,
}: ReportDetailProps): React.JSX.Element {
  return (
    <div className="mt-6 space-y-7">
      <dl className="grid gap-4 text-small sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink-muted">Reason</dt>
          <dd className="mt-1">{humanize(detail.reason)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-muted">Status</dt>
          <dd className="mt-1">{humanize(detail.status)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-muted">Page</dt>
          <dd className="mt-1 break-all">{detail.pageId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-muted">Creator</dt>
          <dd className="mt-1 break-all">{detail.creatorId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-muted">Page moderation</dt>
          <dd className="mt-1">
            {humanize(detail.pageModerationStatus)} · version{" "}
            {detail.pageModerationVersion}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink-muted">Creator moderation</dt>
          <dd className="mt-1">
            {humanize(detail.creatorModerationStatus)} · version{" "}
            {detail.creatorModerationVersion}
          </dd>
        </div>
      </dl>
      {detail.message ? (
        <div>
          <h3 className="font-display text-xl font-semibold">Report message</h3>
          <p className="mt-3 whitespace-pre-wrap rounded-medium border border-border bg-surface-muted p-4 text-body">
            {detail.message}
          </p>
        </div>
      ) : (
        <p className="rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">
          No additional message was provided.
        </p>
      )}
      <section aria-labelledby="report-actions-title">
        <h3
          id="report-actions-title"
          className="font-display text-xl font-semibold"
        >
          Report actions
        </h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            className="px-4"
            disabled={mutating || detail.status === "REVIEWED"}
            onClick={() => onReportAction("review")}
          >
            Mark reviewed
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            disabled={mutating || detail.status === "DISMISSED"}
            onClick={() => onReportAction("dismiss")}
          >
            Dismiss
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            disabled={mutating || detail.status === "OPEN"}
            onClick={() => onReportAction("reopen")}
          >
            Reopen
          </Button>
        </div>
      </section>
      <section aria-labelledby="target-actions-title">
        <h3
          id="target-actions-title"
          className="font-display text-xl font-semibold"
        >
          Target safety controls
        </h3>
        <p className="mt-2 text-small text-ink-muted">
          These controls change moderation state only. They never open the page
          or expose private content.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            disabled={mutating || detail.pageModerationStatus === "DISABLED"}
            onClick={() => onPageAction("disable")}
          >
            Disable page
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            disabled={mutating || detail.pageModerationStatus === "ACTIVE"}
            onClick={() => onPageAction("restore")}
          >
            Restore page
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            disabled={mutating || detail.creatorModerationStatus === "DISABLED"}
            onClick={() => onUserAction("disable")}
          >
            Disable creator
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            disabled={mutating || detail.creatorModerationStatus === "ACTIVE"}
            onClick={() => onUserAction("restore")}
          >
            Restore creator
          </Button>
        </div>
      </section>
      <section aria-labelledby="appeal-title">
        <h3 id="appeal-title" className="font-display text-xl font-semibold">
          Appeal state
        </h3>
        {detail.appeal ? (
          <div className="mt-3 rounded-medium border border-border bg-surface-muted p-4 text-small">
            <p>
              <span className="font-semibold">
                {humanize(detail.appeal.status)}
              </span>{" "}
              · {detail.appeal.externalReference}
            </p>
            <p className="mt-1 text-ink-muted">
              {humanize(detail.appeal.reasonCode)} · version{" "}
              {detail.appeal.moderationVersion}
            </p>
            {detail.appeal.status === "REQUESTED" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="primary"
                  className="px-4"
                  disabled={mutating}
                  onClick={() => onAppealAction("accept")}
                >
                  Accept appeal
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 hover:border-wine"
                  disabled={mutating}
                  onClick={() => onAppealAction("reject")}
                >
                  Reject appeal
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <form
            className="mt-3 rounded-medium border border-border bg-surface-muted p-4"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateAppeal();
            }}
          >
            <p className="text-small text-ink-muted">
              Record an external support intake without adding creator writing
              to the moderation record.
            </p>
            <label
              className="mt-4 block text-small font-semibold"
              htmlFor="appeal-reference"
            >
              External reference
              <Input
                id="appeal-reference"
                className="mt-2 min-h-11 w-full rounded-medium bg-surface px-3"
                maxLength={120}
                required
                value={appealReference}
                onChange={(event) =>
                  onAppealReferenceChange(event.target.value)
                }
              />
            </label>
            <label
              className="mt-4 block text-small font-semibold"
              htmlFor="appeal-reason"
            >
              Reason
              <select
                id="appeal-reason"
                className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3"
                value={appealReason}
                onChange={(event) =>
                  onAppealReasonChange(event.target.value as ReportReason)
                }
              >
                {reasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              variant="secondary"
              className="mt-4 px-4 hover:border-wine"
              disabled={appealMutating || !detail.actions.length}
            >
              {appealMutating ? "Saving…" : "Record appeal intake"}
            </Button>
          </form>
        )}
      </section>
      <section aria-labelledby="history-title">
        <h3 id="history-title" className="font-display text-xl font-semibold">
          Moderation history
        </h3>
        {detail.actions.length === 0 ? (
          <p className="mt-3 text-small text-ink-muted">
            No actions have been recorded.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {detail.actions.map((action) => (
              <li
                key={action.id}
                className="rounded-medium border border-border bg-surface-muted p-4 text-small"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{humanize(action.actionType)}</p>
                  <time
                    className="text-label text-ink-muted"
                    dateTime={action.createdAt}
                  >
                    {formatDate(action.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-ink-muted">
                  {humanize(action.targetType)} · {action.targetId}
                </p>
                {action.note ? (
                  <p className="mt-2 whitespace-pre-wrap">{action.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
