"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deletionAcceptRequestSchema,
  type DeletionAcceptRequest,
  type DeletionPreview,
} from "@letterly/contracts/admin-deletions";
import type { AdminPageRecord } from "@letterly/contracts/admin-operations";
import { WebApiError } from "@/lib/api/errors";
import {
  acceptPageDeletion,
  listDeletions,
  previewPageDeletion,
} from "./deletions-api";
import { reasons } from "./moderation-presentation";
import styles from "./admin-theme.module.css";

type Fields = {
  typedTargetId: string;
  reasonCode: string;
  note: string;
  confirm: boolean;
};
export function RetainedDeletionLookup({
  pageId,
  targetType = "PAGE",
}: {
  pageId: string;
  targetType?: "PAGE" | "CREATOR";
}) {
  const targetId = targetType === "PAGE" ? pageId.toLowerCase() : pageId;
  const query = useQuery({
    queryKey: ["admin-deletions", "target", targetType, targetId],
    queryFn: ({ signal }) =>
      listDeletions({ targetType, targetId, size: 1 }, { signal }),
  });
  const job = query.data?.items[0];
  return job ? (
    <Link
      className="mt-4 inline-flex min-h-11 items-center text-wine underline"
      href={`/admin/deletions/${job.id}`}
    >
      View retained deletion progress
      {targetType === "CREATOR"
        ? ` (${job.state.toLowerCase().replaceAll("_", " ")})`
        : null}
    </Link>
  ) : query.error ? (
    <p className="mt-3" role="status">
      Deletion progress lookup is unavailable.{" "}
      <Button variant="secondary" onClick={() => void query.refetch()}>
        Retry progress lookup
      </Button>
    </p>
  ) : null;
}
export function AdminPageDeletion({
  page,
  targetType = "PAGE",
}: {
  page: Pick<
    AdminPageRecord,
    "id" | "moderationVersion" | "deletionRequestedAt" | "deletionJobId"
  >;
  targetType?: "PAGE" | "CREATOR";
}) {
  const subject = targetType === "PAGE" ? "page" : "creator account";
  const idLabel = targetType === "PAGE" ? "page ID" : "creator ID";
  const router = useRouter(),
    client = useQueryClient();
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [message, setMessage] = useState("");
  const frozen = useRef<DeletionAcceptRequest | null>(null);
  const form = useForm<Fields>({
    defaultValues: {
      typedTargetId: "",
      reasonCode: "OTHER",
      note: "",
      confirm: false,
    },
  });
  const load = useMutation({
    mutationFn: () =>
      previewPageDeletion(page.id, page.moderationVersion, targetType),
    onSuccess: (value) => {
      frozen.current = null;
      form.reset();
      setMessage("");
      setPreview(value);
    },
    onError: () =>
      setMessage(
        "Permanent deletion is unavailable. Refresh the details before trying again.",
      ),
  });
  const mutation = useMutation({
    mutationFn: (body: DeletionAcceptRequest) =>
      acceptPageDeletion(page.id, body, targetType),
    onSuccess: async (job) => {
      frozen.current = null;
      setPreview(null);
      await client.invalidateQueries({ queryKey: ["admin-directory"] });
      router.push(`/admin/deletions/${job.id}`);
    },
    onError: async (error) => {
      if (error instanceof WebApiError && error.statusCode === 409) {
        frozen.current = null;
        setPreview(null);
        await client.invalidateQueries({
          queryKey: [
            targetType === "PAGE" ? "admin-page" : "admin-creator",
            page.id,
          ],
        });
        setMessage(
          targetType === "PAGE"
            ? "The page or impact changed. Review the refreshed details and request a new preview."
            : "The account or impact changed. Review the refreshed details and request a new preview.",
        );
      } else
        setMessage(
          "The request could not be confirmed. Retry the same request, or cancel and review the details.",
        );
    },
  });
  if (page.deletionRequestedAt)
    return (
      <section className={styles.panel}>
        <h2 className="text-lg font-semibold">Permanent deletion</h2>
        <p className="mt-3">
          This {subject} is blocked while permanent cleanup runs. It cannot be
          restored.
        </p>
        {page.deletionJobId ? (
          <Link
            className="mt-3 inline-flex min-h-11 items-center text-wine underline"
            href={`/admin/deletions/${page.deletionJobId}`}
          >
            View deletion progress
          </Link>
        ) : (
          <RetainedDeletionLookup pageId={page.id} targetType={targetType} />
        )}
      </section>
    );
  const attempted = !!frozen.current;
  return (
    <section className={styles.panel}>
      <h2 className="text-lg font-semibold">Permanent deletion</h2>
      <p className="mt-3 text-ink-muted">
        Deletion blocks this {subject} immediately and removes its records and
        uploaded media through tracked cleanup. There is no undo.
      </p>
      <Dialog.Root
        open={!!preview}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            setPreview(null);
            frozen.current = null;
          }
        }}
      >
        <Dialog.Trigger asChild>
          <Button
            className="mt-4"
            variant="secondary"
            loading={load.isPending}
            onClick={(event) => {
              event.preventDefault();
              load.mutate();
            }}
          >
            Preview permanent deletion
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50" />
          <Dialog.Content
            data-admin-root
            className={`${styles.root} ${styles.deletionDialog}`}
            onEscapeKeyDown={(event) => {
              if (mutation.isPending) event.preventDefault();
            }}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <Dialog.Title className="text-2xl font-semibold">
              Permanently delete {subject}
            </Dialog.Title>
            <Dialog.Description className="mt-3">
              This action cannot be undone. Check the impact, enter the exact{" "}
              {idLabel}, and confirm permanent deletion.
            </Dialog.Description>
            {preview ? (
              <>
                <dl
                  className="mt-5 grid grid-cols-2 gap-3 text-sm"
                  aria-label="Deletion impact"
                >
                  {Object.entries(preview.counts).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-ink-muted">
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (letter) => letter.toUpperCase())}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {targetType === "CREATOR" ? (
                  <p className="mt-4 text-sm text-ink-muted">
                    The page count includes pages already removed that still
                    have uploads to clean up.
                  </p>
                ) : null}
                <p className="mt-4 text-sm text-ink-muted">
                  Preview expires at {preview.expiresAt}. Uploaded media may
                  require operations evidence before cleanup can finish.
                </p>
                <form
                  className="mt-5 grid gap-4"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (frozen.current) {
                      mutation.mutate(frozen.current);
                      return;
                    }
                    void form.handleSubmit((values) => {
                      if (values.typedTargetId !== page.id) {
                        form.setError("typedTargetId", {
                          message: `Enter the exact ${idLabel}.`,
                        });
                        return;
                      }
                      const parsed = deletionAcceptRequestSchema.safeParse({
                        ...values,
                        expectedModerationVersion:
                          preview.expectedModerationVersion,
                        confirmationToken: preview.confirmationToken,
                        idempotencyKey: crypto.randomUUID(),
                      });
                      if (!parsed.success) {
                        form.setError("root", {
                          message:
                            "Choose a reason and confirm permanent deletion.",
                        });
                        return;
                      }
                      frozen.current = parsed.data;
                      mutation.mutate(parsed.data);
                    })();
                  }}
                >
                  <label className="grid gap-2 text-sm font-semibold">
                    Reason
                    <select
                      className="min-h-11 rounded-md border border-input bg-surface px-3 text-base"
                      disabled={attempted || mutation.isPending}
                      {...form.register("reasonCode")}
                    >
                      {reasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Internal note (optional)
                    <textarea
                      className="min-h-24 rounded-md border border-input bg-surface p-3 text-base"
                      maxLength={500}
                      disabled={attempted || mutation.isPending}
                      {...form.register("note")}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Exact {idLabel}
                    <span className="break-all font-normal text-ink-muted">
                      {page.id}
                    </span>
                    <Input
                      disabled={attempted || mutation.isPending}
                      aria-invalid={!!form.formState.errors.typedTargetId}
                      aria-describedby="deletion-id-error"
                      {...form.register("typedTargetId")}
                    />
                  </label>
                  {form.formState.errors.typedTargetId ? (
                    <p
                      id="deletion-id-error"
                      role="alert"
                      className="text-error"
                    >
                      {form.formState.errors.typedTargetId.message}
                    </p>
                  ) : null}
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={attempted || mutation.isPending}
                      {...form.register("confirm")}
                    />
                    I understand this permanently deletes the {subject}.
                  </label>
                  {form.formState.errors.root ? (
                    <p role="alert" className="text-error">
                      {form.formState.errors.root.message}
                    </p>
                  ) : null}
                  {message ? (
                    <p role="alert" className="text-error">
                      {message}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={mutation.isPending}
                      onClick={() => {
                        setPreview(null);
                        frozen.current = null;
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" loading={mutation.isPending}>
                      {attempted
                        ? "Retry deletion request"
                        : `Permanently delete ${subject}`}
                    </Button>
                  </div>
                </form>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {message && !preview ? (
        <p className="mt-4" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
