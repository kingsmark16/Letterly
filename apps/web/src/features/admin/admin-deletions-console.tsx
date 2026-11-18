"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  deletionListQuerySchema,
  deletionJobParamsSchema,
  deletionStateSchema,
  type DeletionJobDetail,
  type DeletionRetryRequest,
} from "@letterly/contracts/admin-deletions";
import { WebApiError } from "@/lib/api/errors";
import { getDeletion, listDeletions, retryDeletion } from "./deletions-api";
import { AdminDate } from "./admin-directory";
import { humanize } from "./moderation-presentation";
import styles from "./admin-theme.module.css";

export function AdminDeletionsConsole() {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const raw = Object.fromEntries(params.entries());
  const parsed = deletionListQuerySchema.safeParse(raw);
  const form = useForm({
    values: {
      state: params.get("state") ?? "",
      targetType: params.get("targetType") ?? "",
      targetId: params.get("targetId") ?? "",
    },
  });
  const query = useQuery({
    queryKey: ["admin-deletions", "list", params.toString()],
    enabled: parsed.success,
    queryFn: ({ signal }) =>
      listDeletions(parsed.success ? parsed.data : {}, { signal }),
    refetchInterval: (query) =>
      query.state.data?.items.some((job) => job.state !== "COMPLETED")
        ? 5000
        : false,
    refetchIntervalInBackground: false,
  });
  function update(values: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(values))
      if (value) next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }
  return (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-7xl gap-6 p-4 md:p-6 lg:p-8"
    >
      <header>
        <h1 className="text-3xl font-semibold">Deletion progress</h1>
        <p className="mt-2 text-ink-muted">
          Follow permanent cleanup and review work that needs attention. Leaving
          this screen does not stop cleanup.
        </p>
      </header>
      <section className={styles.panel} aria-label="Deletion filters">
        <form
          className="grid gap-4 md:grid-cols-3"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            const fields = Object.fromEntries(
              Object.entries(values).filter(([, value]) => !!value),
            );
            if (!deletionListQuerySchema.safeParse(fields).success) {
              form.setError("root", {
                message:
                  "Choose a target type when entering an exact target ID.",
              });
              return;
            }
            update(fields);
          })}
        >
          <label className="grid gap-2 text-sm font-semibold">
            State
            <select
              className="min-h-11 rounded-md border border-input bg-surface px-3 text-base"
              {...form.register("state")}
            >
              <option value="">All states</option>
              {deletionStateSchema.options.map((state) => (
                <option key={state} value={state}>
                  {humanize(state)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Target type
            <select
              className="min-h-11 rounded-md border border-input bg-surface px-3 text-base"
              {...form.register("targetType")}
            >
              <option value="">All targets</option>
              <option value="PAGE">Page</option>
              <option value="CREATOR">Creator</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Exact target ID
            <Input maxLength={200} {...form.register("targetId")} />
          </label>
          {form.formState.errors.root ? (
            <p role="alert" className="text-error md:col-span-3">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 md:col-span-3">
            <Button type="submit">Apply filters</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                form.reset({ state: "", targetType: "", targetId: "" });
                update({});
              }}
            >
              Reset filters
            </Button>
          </div>
        </form>
      </section>
      {!parsed.success ? (
        <section className={styles.panel} role="alert">
          <p>The deletion filters are invalid.</p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => update({})}
          >
            Clear invalid filters
          </Button>
        </section>
      ) : query.error ? (
        <section className={styles.panel} role="alert">
          <h2 className="text-xl font-semibold">
            Could not load deletion progress
          </h2>
          <Button className="mt-4" onClick={() => void query.refetch()}>
            Retry deletion list
          </Button>
        </section>
      ) : !query.data ? (
        <section className={styles.panel} role="status" aria-busy="true">
          Loading deletion progress…
        </section>
      ) : !query.data.items.length ? (
        <section className={styles.panel} role="status">
          <h2 className="text-xl font-semibold">No deletion jobs</h2>
          <p className="mt-3">No retained jobs match these filters.</p>
        </section>
      ) : (
        <section className={styles.panel} aria-label="Deletion jobs">
          <ul className="grid gap-4">
            {query.data.items.map((job) => (
              <li
                key={job.id}
                className="grid gap-3 rounded-md border border-[var(--admin-divider)] p-4 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div>
                  <Link
                    className="inline-flex min-h-11 items-center break-all text-wine underline"
                    href={`/admin/deletions/${job.id}`}
                  >
                    {humanize(job.targetType)} {job.targetId}
                  </Link>
                  <p className="text-sm text-ink-muted">
                    Requested <AdminDate value={job.requestedAt} />
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{humanize(job.state)}</p>
                  <p className="text-sm">
                    {job.mediaCompleted} of {job.mediaTotal} media objects
                    acknowledged
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            {params.get("cursor") ? (
              <Button
                variant="secondary"
                onClick={() => update({ ...raw, cursor: undefined })}
              >
                First deletion jobs
              </Button>
            ) : null}
            {query.data.nextCursor ? (
              <Button
                variant="secondary"
                onClick={() =>
                  update({ ...raw, cursor: query.data!.nextCursor! })
                }
              >
                Next deletion jobs
              </Button>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}

function RetryCleanup({
  job,
  onFinished,
}: {
  job: DeletionJobDetail;
  onFinished: () => void;
}) {
  const client = useQueryClient();
  const frozen = useRef<DeletionRetryRequest | null>(null);
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (body: DeletionRetryRequest) => retryDeletion(job.id, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-deletion", job.id] });
      await client.invalidateQueries({ queryKey: ["admin-deletions"] });
      frozen.current = null;
      setOpen(false);
      setMessage("Cleanup retry was recorded.");
      onFinished();
    },
    onError: async (error) => {
      if (error instanceof WebApiError && error.statusCode === 409) {
        frozen.current = null;
        setOpen(false);
        await client.invalidateQueries({
          queryKey: ["admin-deletion", job.id],
        });
        setMessage(
          "Retry is not available in the current state. Operations evidence may still be required. Review the refreshed progress.",
        );
        onFinished();
      } else
        setMessage(
          "The retry could not be confirmed. You can retry the same request or cancel.",
        );
    },
  });
  return (
    <section className={styles.panel}>
      <h2 className="text-xl font-semibold">Resume cleanup</h2>
      <p className="mt-3 text-ink-muted">
        Retry resumes this job. It cannot override an active lease or unresolved
        processor and upload evidence.
      </p>
      <Dialog.Root
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending) {
            setOpen(value);
            if (!value) frozen.current = null;
          }
        }}
      >
        <Dialog.Trigger asChild>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              frozen.current = null;
              setMessage("");
            }}
          >
            Retry cleanup
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
              Retry deletion cleanup
            </Dialog.Title>
            <Dialog.Description className="mt-3">
              Confirm that this existing job should resume its unfinished
              cleanup. Completed work will not be repeated.
            </Dialog.Description>
            {message ? (
              <p role="alert" className="mt-4 text-error">
                {message}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => {
                  setOpen(false);
                  frozen.current = null;
                }}
              >
                Cancel
              </Button>
              <Button
                loading={mutation.isPending}
                onClick={() => {
                  const body = frozen.current ?? {
                    confirm: true as const,
                    expectedJobVersion: job.version,
                    idempotencyKey: crypto.randomUUID(),
                  };
                  frozen.current = body;
                  mutation.mutate(body);
                }}
              >
                {frozen.current ? "Retry same request" : "Confirm retry"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {message && !open ? (
        <p className="mt-4" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

export function AdminDeletionDetail({ id }: { id: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const valid = deletionJobParamsSchema.safeParse({ jobId: id }).success;
  const query = useQuery({
    queryKey: ["admin-deletion", id],
    queryFn: ({ signal }) => getDeletion(id, { signal }),
    enabled: valid,
    refetchInterval: (query) =>
      query.state.error || query.state.data?.state === "COMPLETED"
        ? false
        : 5000,
    refetchIntervalInBackground: false,
  });
  const job = query.data;
  const absent =
    !valid ||
    (query.error instanceof WebApiError && query.error.statusCode === 404);
  return (
    <main
      id="main-content"
      className="mx-auto grid w-full max-w-7xl gap-6 p-4 md:p-6 lg:p-8"
    >
      <header>
        <Link
          className="inline-flex min-h-11 items-center text-wine underline"
          href="/admin/deletions"
        >
          Deletion progress
        </Link>
        <h1 ref={heading} tabIndex={-1} className="mt-3 text-3xl font-semibold">
          Deletion job
        </h1>
      </header>
      {absent ? (
        <section className={styles.panel} role="status">
          No retained deletion job is available for this ID.
        </section>
      ) : query.error ? (
        <section className={styles.panel} role="alert">
          <p>Could not load deletion progress.</p>
          <Button className="mt-4" onClick={() => void query.refetch()}>
            Retry deletion progress
          </Button>
        </section>
      ) : !job ? (
        <section className={styles.panel} role="status" aria-busy="true">
          Loading deletion job…
        </section>
      ) : (
        <>
          <section
            className={styles.panel}
            aria-labelledby="deletion-state-title"
          >
            <h2
              id="deletion-state-title"
              className="text-xl font-semibold"
              aria-live="polite"
            >
              {humanize(job.state)}
            </h2>
            <p className="mt-3 text-ink-muted">
              {job.state === "COMPLETED"
                ? "Applicable records and uploaded objects have been removed."
                : job.state === "NEEDS_ATTENTION"
                  ? "Cleanup needs operations attention. The target remains blocked."
                  : "The target is blocked while cleanup runs. This screen refreshes every 5 seconds while visible."}
            </p>
            <dl className={`${styles.facts} mt-5`}>
              <div>
                <dt>Job ID</dt>
                <dd className="break-all">{job.id}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd className="break-all">
                  {humanize(job.targetType)} {job.targetId}
                </dd>
              </div>
              <div>
                <dt>Pages completed</dt>
                <dd>
                  {job.pagesCompleted} of {job.pagesTotal}
                </dd>
              </div>
              <div>
                <dt>Media objects acknowledged</dt>
                <dd>
                  {job.mediaCompleted} of {job.mediaTotal}
                </dd>
              </div>
              <div>
                <dt>Database batches completed</dt>
                <dd>{job.databaseBatchesCompleted}</dd>
              </div>
              <div>
                <dt>Consecutive failed attempts</dt>
                <dd>{job.attempts}</dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>
                  <AdminDate value={job.requestedAt} />
                </dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>
                  <AdminDate value={job.startedAt} />
                </dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>
                  <AdminDate value={job.completedAt} />
                </dd>
              </div>
              <div>
                <dt>Next automatic retry</dt>
                <dd>
                  <AdminDate value={job.nextRetryAt} />
                </dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{humanize(job.reasonCode)}</dd>
              </div>
              <div>
                <dt>Last failure</dt>
                <dd>
                  {job.lastFailureCode
                    ? humanize(job.lastFailureCode)
                    : "None recorded"}
                </dd>
              </div>
              <div>
                <dt>Internal note</dt>
                <dd className="whitespace-pre-wrap">
                  {job.note ?? "None recorded"}
                </dd>
              </div>
            </dl>
            <Link
              className="mt-5 inline-flex min-h-11 items-center text-wine underline"
              href={`/admin/moderation/audit?targetType=${job.targetType === "PAGE" ? "PAGE" : "USER"}&targetId=${encodeURIComponent(job.targetId)}`}
            >
              View target audit history
            </Link>
          </section>
          {["NEEDS_ATTENTION", "RETRY_WAIT"].includes(job.state) ? (
            <RetryCleanup
              job={job}
              onFinished={() =>
                window.requestAnimationFrame(() => heading.current?.focus())
              }
            />
          ) : null}
        </>
      )}
    </main>
  );
}
