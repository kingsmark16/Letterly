"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth-client";
import { createPage, type WebApiError } from "../../../lib/api-client";
import {
  createSignInPath,
  createTemplateStartPath,
} from "../../../lib/return-path";
import styles from "./create-draft-button.module.css";

type CreateDraftButtonProps = {
  className?: string;
  label: string;
  templateVersionId: string;
  templateName?: string;
};

export function CreateDraftButton({
  className,
  label,
  templateVersionId,
  templateName,
}: CreateDraftButtonProps): React.JSX.Element {
  const router = useRouter();
  const session = authClient.useSession();
  const templateStartPath = createTemplateStartPath(templateVersionId);
  const mutation = useMutation({
    mutationFn: () => createPage({ templateVersionId }),
    onSuccess: (page) => {
      router.push(`/dashboard/pages/${page.id}/edit?section=content`);
    },
  });
  const error = mutation.error as WebApiError | null;
  const shouldCheckDrafts = Boolean(
    error &&
    (error.code === "OFFLINE" ||
      error.code === "TIMEOUT" ||
      error.code === "MALFORMED_RESPONSE" ||
      (error.statusCode !== undefined && error.statusCode >= 500)),
  );

  function createDraft(): void {
    if (session.isPending) {
      return;
    }

    if (!session.data || error?.statusCode === 401) {
      router.push(createSignInPath(templateStartPath));
      return;
    }

    mutation.mutate();
  }

  return (
    <>
      <button
        aria-busy={session.isPending || mutation.isPending}
        aria-label={templateName ? label + " with " + templateName : label}
        className={className}
        disabled={session.isPending || mutation.isPending || shouldCheckDrafts}
        onClick={createDraft}
        type="button"
      >
        {session.isPending
          ? "Checking sign-in…"
          : mutation.isPending
            ? "Creating draft…"
            : error?.statusCode === 401
              ? "Sign in again"
              : label}
      </button>
      {error ? (
        <div className={styles.feedback} role="alert">
          <p>{error.message}</p>
          {error.requestId ? <p>Request ID: {error.requestId}</p> : null}
          {shouldCheckDrafts ? (
            <>
              <p>Check your drafts before trying again.</p>
              <Link href="/dashboard/pages?status=DRAFT">Check My Pages</Link>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
