"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth-client";
import { createPage, type WebApiError } from "../../../lib/api-client";
import { createSignInPath } from "../../../lib/return-path";
import { DashboardHeader } from "./dashboard-header";
import styles from "./create-letter.module.css";

interface CreateLetterProps {
  templateVersionId: string;
}

export function CreateLetter({
  templateVersionId,
}: CreateLetterProps): React.JSX.Element {
  const router = useRouter();
  const session = authClient.useSession();
  const mutation = useMutation({
    mutationFn: () => createPage({ templateVersionId }),
    onSuccess: (page) => {
      router.push(`/dashboard/letters/${page.id}/edit`);
    },
  });

  if (session.isPending) {
    return (
      <main className={styles.page} aria-busy="true">
        <DashboardHeader />
        <div className={styles.loadingPanel}>
          <p className={styles.eyebrow}>Preparing your private page</p>
          <h1>Checking your session...</h1>
          <p>One quiet moment, then you can start writing.</p>
        </div>
      </main>
    );
  }

  if (!session.data) {
    return (
      <main className={styles.page}>
        <DashboardHeader />
        <div className={styles.shell}>
          <section className={styles.intro} aria-labelledby="create-title">
            <p className={styles.eyebrow}>A private beginning</p>
            <h1 id="create-title">Give your words a place to land.</h1>
            <p>
              Sign in first, then your draft will belong to you from the moment
              it is created.
            </p>
          </section>

          <section className={styles.panel} aria-labelledby="sign-in-title">
            <p className={styles.eyebrow}>Secret Letter</p>
            <h2 id="sign-in-title">Keep this page yours.</h2>
            <p>
              Your writing stays private while you make it. Sign in to create
              and save this draft securely.
            </p>
            <a
              className={styles.primaryButton}
              href={createSignInPath(
                `/create?templateVersionId=${templateVersionId}`,
              )}
            >
              Continue to sign in
            </a>
            <Link className={styles.secondaryLink} href="/templates">
              Return to templates
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const error = mutation.error as WebApiError | null;

  return (
    <main className={styles.page}>
      <DashboardHeader />
      <div className={styles.shell}>
        <section className={styles.intro} aria-labelledby="create-title">
          <p className={styles.eyebrow}>Secret Letter</p>
          <h1 id="create-title">Start with a blank page and a feeling.</h1>
          <p>
            Your first draft begins with a calm place for the words you want
            someone to keep. You can change everything before you share it.
          </p>
          <p className={styles.note}>
            Private by default. Nothing is published when you create a draft.
          </p>
        </section>

        <section className={styles.panel} aria-labelledby="ready-title">
          <p className={styles.eyebrow}>Your draft</p>
          <h2 id="ready-title">Ready when you are.</h2>
          <p>
            We will create one private draft with the trusted Secret Letter
            defaults, then open its editor.
          </p>

          {error ? (
            <div className={styles.errorMessage} role="alert">
              <strong>{error.message}</strong>
              {error.requestId ? (
                <span>Request ID: {error.requestId}</span>
              ) : null}
            </div>
          ) : null}

          <button
            className={styles.primaryButton}
            type="button"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating your draft..." : "Create my draft"}
          </button>
          <Link className={styles.secondaryLink} href="/templates">
            Return to templates
          </Link>
        </section>
      </div>
    </main>
  );
}
