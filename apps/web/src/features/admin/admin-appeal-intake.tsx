"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminAppealCreateRequestSchema,
  type AdminAppealCreateRequest,
} from "@letterly/contracts/moderation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { createAdminAppeal } from "./api";
import { reasons, type ReportReason } from "./moderation-presentation";
import styles from "./admin-theme.module.css";

export function AdminAppealIntake() {
  const client = useQueryClient();
  const attempt = useRef<AdminAppealCreateRequest | null>(null);
  const [message, setMessage] = useState("");
  const form = useForm<{
    targetActionId: string;
    externalReference: string;
    reasonCode: ReportReason;
  }>({
    defaultValues: {
      targetActionId: "",
      externalReference: "",
      reasonCode: "OTHER",
    },
  });
  const mutation = useMutation({
    mutationFn: createAdminAppeal,
    onSuccess: () => {
      attempt.current = null;
      form.reset();
      setMessage("Appeal intake recorded.");
      void client.invalidateQueries({
        queryKey: ["admin-directory", "appeals"],
      });
      void client.invalidateQueries({ queryKey: ["admin-audit"] });
    },
    onError: () =>
      setMessage(
        "Intake could not be confirmed. Retry the same request, or cancel before editing it.",
      ),
  });
  const locked = mutation.isPending || Boolean(attempt.current);
  return (
    <section className={styles.panel} aria-labelledby="appeal-intake-title">
      <h2 id="appeal-intake-title" className="text-lg font-semibold">
        Record support appeal
      </h2>
      <p className="mt-2 text-ink-muted">
        Use the original moderation action ID and an external support reference.
        Keep private writing out of the reference.
      </p>
      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          if (attempt.current) {
            mutation.mutate(attempt.current);
            return;
          }
          const parsed = adminAppealCreateRequestSchema.safeParse({
            ...values,
            idempotencyKey: crypto.randomUUID(),
          });
          if (!parsed.success) {
            form.setError("root", {
              message:
                "Enter a valid action ID and a support reference of 1 to 120 characters.",
            });
            return;
          }
          const body = parsed.data;
          attempt.current = body;
          mutation.mutate(body);
        })}
      >
        <label className="grid gap-2 font-medium">
          Original action ID
          <Input
            {...form.register("targetActionId")}
            disabled={locked}
            aria-describedby="appeal-intake-error"
          />
        </label>
        <label className="grid gap-2 font-medium">
          Support reference
          <Input
            {...form.register("externalReference")}
            maxLength={120}
            disabled={locked}
            aria-describedby="appeal-intake-error"
          />
        </label>
        <label className="grid gap-2 font-medium">
          Appeal reason
          <select
            {...form.register("reasonCode")}
            disabled={locked}
            className="min-h-11 rounded-md border border-input bg-surface px-3"
          >
            {reasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <Button type="submit" loading={mutation.isPending}>
            {attempt.current ? "Retry intake" : "Record appeal intake"}
          </Button>
          {attempt.current ? (
            <Button
              type="button"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => {
                attempt.current = null;
                mutation.reset();
                setMessage("");
              }}
            >
              Cancel retry
            </Button>
          ) : null}
        </div>
        <p
          id="appeal-intake-error"
          role={form.formState.errors.root ? "alert" : undefined}
          className="text-error"
        >
          {form.formState.errors.root?.message}
        </p>
      </form>
      {message ? (
        <p className="mt-4" role="status">
          {message}
        </p>
      ) : null}
      {mutation.data ? (
        <Link
          className="mt-3 inline-flex min-h-11 items-center text-wine underline"
          href={`/admin/moderation/appeals/${mutation.data.appealId}`}
        >
          Open recorded appeal
        </Link>
      ) : null}
    </section>
  );
}
