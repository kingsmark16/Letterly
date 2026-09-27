"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type {
  OwnerPageProjection,
  PageLifecycleResponse,
} from "@letterly/contracts/pages";
import {
  setPagePassword,
  type WebApiError,
  unpublishPage,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import type { QuestionReadiness } from "./editor-overview";
import styles from "./editor-settings.module.css";

interface EditorSettingsProps {
  page: OwnerPageProjection;
  questionReadiness: QuestionReadiness;
  dangerZone?: React.ReactNode;
  onChanged: (response: PageLifecycleResponse) => void;
}

interface Feedback {
  message: string;
  error: boolean;
}

function LockIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LinkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m10 13 4-4" />
      <path d="m7.5 16.5-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" />
    </svg>
  );
}

function MessageIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <path d="M7.5 10.5h9m-9 3h5" />
    </svg>
  );
}

export function EditorSettings({
  page,
  questionReadiness,
  dangerZone,
  onChanged,
}: EditorSettingsProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(
    page.passwordProtected,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const passwordMutation = useMutation<
    { passwordProtected: boolean },
    WebApiError,
    string | null
  >({
    mutationFn: (value) => setPagePassword(page.id, { password: value }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: pageKeys.detail(page.id),
      });
      setPasswordProtected(result.passwordProtected);
      setPassword("");
      setShowPassword(false);
      setFeedback({
        message: result.passwordProtected
          ? "Password protection is on."
          : "Password protection is off.",
        error: false,
      });
    },
    onError: (error) => setFeedback({ message: error.message, error: true }),
  });
  const unpublishMutation = useMutation<
    PageLifecycleResponse,
    WebApiError,
    { confirm: true }
  >({
    mutationFn: (input) => unpublishPage(page.id, input),
    onSuccess: (response) => {
      setFeedback({
        message: "Letter unpublished. Its public link is no longer available.",
        error: false,
      });
      onChanged(response);
    },
    onError: (error) => setFeedback({ message: error.message, error: true }),
  });

  function savePassword(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = password.trim();
    if (!value) {
      setFeedback({ message: "Enter a password before saving.", error: true });
      return;
    }

    setFeedback(null);
    passwordMutation.mutate(value);
  }

  function removePassword(): void {
    if (!window.confirm("Remove password protection from this letter?")) return;
    setFeedback(null);
    passwordMutation.mutate(null);
  }

  function handleUnpublish(): void {
    if (
      !window.confirm(
        "Unpublish this letter? Its public link will stop working immediately.",
      )
    ) {
      return;
    }

    setFeedback(null);
    unpublishMutation.mutate({ confirm: true });
  }

  async function copyPublicLink(): Promise<void> {
    if (!page.canonicalUrl || !navigator.clipboard) {
      setFeedback({
        message: "This link cannot be copied right now.",
        error: true,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(page.canonicalUrl);
      setFeedback({ message: "Public link copied.", error: false });
    } catch {
      setFeedback({
        message: "Copy failed. Open the letter to copy its address.",
        error: true,
      });
    }
  }

  const responseStatus = getResponseStatus(page, questionReadiness);
  const hasPublicLink =
    page.status === "PUBLISHED" && Boolean(page.canonicalUrl);

  return (
    <section className={styles.panel} aria-labelledby="settings-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Privacy &amp; access</p>
        <h2 id="settings-title">Choose who can open your letter</h2>
        <p>
          Set a password, check how replies work, and manage the public link.
        </p>
      </header>

      {feedback ? (
        <p
          className={[
            styles.feedback,
            feedback.error ? styles.feedbackError : "",
          ].join(" ")}
          role={feedback.error ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.section} aria-labelledby="password-title">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <LockIcon />
              </span>
              <div>
                <h3 id="password-title">Password</h3>
                <p>
                  {passwordProtected
                    ? "Visitors need this password and your link to read the letter."
                    : "Add a password if the link alone should not open the letter."}
                </p>
              </div>
              <span className={styles.stateLabel}>
                {passwordProtected ? "Password on" : "No password"}
              </span>
            </div>

            <form className={styles.passwordForm} onSubmit={savePassword}>
              <label htmlFor="letter-password">
                {passwordProtected ? "Replace password" : "Add a password"}
              </label>
              <div className={styles.passwordRow}>
                <div className={styles.passwordInput}>
                  <input
                    id="letter-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a password"
                    autoComplete="new-password"
                    maxLength={256}
                    aria-describedby="letter-password-help"
                  />
                  <button
                    className={styles.passwordToggle}
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={passwordMutation.isPending}
                  aria-busy={passwordMutation.isPending}
                >
                  {passwordMutation.isPending ? "Saving..." : "Save password"}
                </button>
              </div>
              <p id="letter-password-help" className={styles.helpText}>
                The saved password is never shown here again.
              </p>
              {passwordProtected ? (
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={removePassword}
                  disabled={passwordMutation.isPending}
                >
                  Remove password
                </button>
              ) : null}
            </form>
          </section>

          <section className={styles.section} aria-labelledby="replies-title">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <MessageIcon />
              </span>
              <div>
                <h3 id="replies-title">Private replies</h3>
                <p>{responseStatus.description}</p>
              </div>
              <span className={styles.stateLabel}>{responseStatus.label}</span>
            </div>
            {responseStatus.retry ? (
              <button
                className={styles.textButton}
                type="button"
                onClick={questionReadiness.onRetry}
              >
                Try again
              </button>
            ) : null}
          </section>
        </div>

        <div className={styles.sideColumn}>
          <section className={styles.linkSection} aria-labelledby="link-title">
            <div className={styles.sideHeading}>
              <span className={styles.sectionIcon}>
                <LinkIcon />
              </span>
              <h3 id="link-title">Public link</h3>
            </div>
            {hasPublicLink ? (
              <>
                <p>Share this address with the people you want to reach.</p>
                <div className={styles.linkValue}>{page.canonicalUrl}</div>
                <div className={styles.linkActions}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => void copyPublicLink()}
                  >
                    Copy link
                  </button>
                  <Link
                    className={styles.textLink}
                    href={"/p/" + page.slug}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open letter
                  </Link>
                </div>
              </>
            ) : (
              <p>Your link will be available here once you publish.</p>
            )}
          </section>

          {page.status === "PUBLISHED" || dangerZone ? (
            <section
              className={styles.manageSection}
              aria-labelledby="manage-title"
            >
              <h3 id="manage-title">Remove access</h3>
              {page.status === "PUBLISHED" ? (
                <div className={styles.manageAction}>
                  <div>
                    <h4>Unpublish letter</h4>
                    <p>
                      Stop visits through the public link. Your letter and
                      replies stay saved.
                    </p>
                  </div>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    disabled={unpublishMutation.isPending}
                    aria-busy={unpublishMutation.isPending}
                    onClick={handleUnpublish}
                  >
                    {unpublishMutation.isPending
                      ? "Unpublishing..."
                      : "Unpublish"}
                  </button>
                </div>
              ) : null}
              {dangerZone ? (
                <div className={styles.deleteArea}>{dangerZone}</div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getResponseStatus(
  page: OwnerPageProjection,
  readiness: QuestionReadiness,
): { label: string; description: string; retry: boolean } {
  if (readiness.isLoading || readiness.isUpdating) {
    return {
      label: "Checking",
      description: "Checking which questions visitors can answer.",
      retry: false,
    };
  }
  if (readiness.isError) {
    return {
      label: "Unavailable",
      description: "Question status could not be loaded.",
      retry: true,
    };
  }
  if (page.status === "ARCHIVED") {
    return {
      label: "Off",
      description: "Archived letters cannot receive new replies.",
      retry: false,
    };
  }
  if (readiness.questionCount === 0) {
    return {
      label: "No questions",
      description: "Add a question to invite a private reply.",
      retry: false,
    };
  }
  return page.status === "PUBLISHED"
    ? {
        label: "On",
        description:
          "Visitors can answer your questions. Only you can see their replies.",
        retry: false,
      }
    : {
        label: "Ready",
        description: "Visitors can reply once you publish this letter.",
        retry: false,
      };
}
