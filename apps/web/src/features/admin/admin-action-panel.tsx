"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { ConfirmationDialog } from "./admin-confirmation-dialog";
import { mutateAdminPage, mutateAdminUser, mutateAdminAppeal } from "./api";
import { WebApiError } from "@/lib/api/errors";
import type { Confirmation, ReportReason } from "./moderation-presentation";
import styles from "./admin-theme.module.css";

type Attempt = { action: Confirmation; note: string; reason: ReportReason };
export function AdminActionPanel({
  kind,
  id,
  version,
  state,
  protectedTarget = false,
}: {
  kind: "page" | "user" | "appeal";
  id: string;
  version: number;
  state: string;
  protectedTarget?: boolean;
}) {
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reason, setReason] = useState<ReportReason>("OTHER");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const attempt = useRef<Attempt | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const returnFocus = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  async function refresh() {
    const detailKey =
      kind === "page"
        ? "admin-page"
        : kind === "user"
          ? "admin-creator"
          : "admin-appeal";
    await Promise.all([
      client.invalidateQueries({ queryKey: [detailKey, id] }),
      client.invalidateQueries({ queryKey: ["admin-directory"] }),
      client.invalidateQueries({ queryKey: ["admin-reports"] }),
      client.invalidateQueries({ queryKey: ["admin-report"] }),
      client.invalidateQueries({ queryKey: ["admin-audit"] }),
    ]);
  }
  function close() {
    attempt.current = null;
    returnFocus.current = true;
    setConfirmation(null);
  }
  const mutation = useMutation({
    mutationFn: async ({ action, note, reason }: Attempt) => {
      const shared = {
        confirm: true as const,
        expectedModerationVersion: action.expectedVersion,
        idempotencyKey: action.idempotencyKey,
        ...(note ? { note } : {}),
      };
      if (action.kind === "page")
        return action.operation === "disable"
          ? mutateAdminPage(id, "disable", { ...shared, reason })
          : mutateAdminPage(id, "restore", shared);
      if (action.kind === "user")
        return action.operation === "disable"
          ? mutateAdminUser(id, "disable", { ...shared, reason })
          : mutateAdminUser(id, "restore", shared);
      if (action.kind === "appeal")
        return mutateAdminAppeal(id, action.operation, shared);
      throw new Error("Invalid action");
    },
    onSuccess: async (result) => {
      await refresh();
      close();
      setMessage(`Action recorded. Reference: ${result.actionId}`);
    },
    onError: async (error) => {
      if (
        error instanceof WebApiError &&
        error.code === "STALE_MODERATION_VERSION"
      ) {
        await refresh();
        close();
        setMessage(
          "This record changed. Review its refreshed state and confirm a new action.",
        );
      } else
        setMessage(
          "The action could not be confirmed. You can retry the same request, or cancel and review the record.",
        );
    },
  });
  useEffect(() => {
    if (confirmation || mutation.isPending || !returnFocus.current) return;
    returnFocus.current = false;
    if (
      trigger.current?.isConnected &&
      !trigger.current.hasAttribute("disabled")
    )
      trigger.current.focus();
    if (document.activeElement !== trigger.current) heading.current?.focus();
  }, [confirmation, mutation.isPending]);
  function open(operation: "disable" | "restore" | "accept" | "reject") {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const shared = {
      targetId: id,
      expectedVersion: version,
      idempotencyKey: crypto.randomUUID(),
      title: `${operation === "disable" ? "Disable" : operation === "restore" ? "Restore" : operation === "accept" ? "Accept" : "Reject"} ${kind === "user" ? "creator" : kind}`,
    };
    const action: Confirmation =
      kind === "appeal" && (operation === "accept" || operation === "reject")
        ? { ...shared, kind, operation }
        : kind !== "appeal" &&
            (operation === "disable" || operation === "restore")
          ? { ...shared, kind, operation, reason: "OTHER" }
          : (() => {
              throw new Error("Invalid action");
            })();
    attempt.current = null;
    setNote("");
    setReason("OTHER");
    setMessage("");
    setConfirmation(action);
  }
  return (
    <section className={styles.panel} aria-labelledby={`actions-${id}`}>
      <h2
        id={`actions-${id}`}
        ref={heading}
        tabIndex={-1}
        className="text-lg font-semibold"
      >
        {kind === "appeal" ? "Appeal decision" : "Moderation actions"}
      </h2>
      {protectedTarget ? (
        <p className="mt-3 text-ink-muted">
          Administrator accounts are protected from account moderation actions.
        </p>
      ) : kind === "appeal" && state !== "REQUESTED" ? (
        <p className="mt-3 text-ink-muted">
          This appeal has already been resolved.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {kind === "appeal" ? (
            <>
              <Button
                onClick={() => open("accept")}
                disabled={mutation.isPending}
              >
                Accept appeal
              </Button>
              <Button
                variant="secondary"
                onClick={() => open("reject")}
                disabled={mutation.isPending}
              >
                Reject appeal
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => open(state === "ACTIVE" ? "disable" : "restore")}
              disabled={mutation.isPending}
            >
              {state === "ACTIVE" ? "Disable" : "Restore"}{" "}
              {kind === "user" ? "creator" : "page"}
            </Button>
          )}
        </div>
      )}
      {message && !confirmation ? (
        <p className="mt-4 break-all text-sm" role="status">
          {message}
        </p>
      ) : null}
      {confirmation ? (
        <ConfirmationDialog
          action={confirmation}
          note={note}
          reason={reason}
          onNoteChange={setNote}
          onReasonChange={setReason}
          onCancel={close}
          pending={mutation.isPending}
          attempted={Boolean(attempt.current)}
          feedback={message}
          onConfirm={() => {
            const value = attempt.current ?? {
              action: confirmation,
              note: note.trim(),
              reason,
            };
            attempt.current = value;
            mutation.mutate(value);
          }}
        />
      ) : null}
    </section>
  );
}
