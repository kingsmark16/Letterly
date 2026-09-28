"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "radix-ui";
import Link from "next/link";
import { useRef, useState } from "react";
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
import styles from "./editor-settings.module.css";

interface EditorSettingsProps {
  page: OwnerPageProjection;
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function LinkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.72-1.72" />
    </svg>
  );
}

function EyeIcon({ hidden = false }: { hidden?: boolean }): React.JSX.Element {
  return hidden ? (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.8 9.5 7-.2.7-.8 1.7-1.7 2.7M6.2 6.2C3.9 7.8 2.8 10.3 2.5 12c.7 2.2 4.3 7 9.5 7 1 0 1.9-.2 2.7-.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M2.5 12s3.6-7 9.5-7 9.5 7 9.5 7-3.6 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function CopyIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="8" y="7" width="12" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function OpenIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M14 3h7v7M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function WarningIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M10.3 3.9 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v5m0 3h.01" />
    </svg>
  );
}

function UnpublishIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.8 9.5 7-.2.7-.8 1.7-1.7 2.7M6.2 6.2C3.9 7.8 2.8 10.3 2.5 12c.7 2.2 4.3 7 9.5 7 1 0 1.9-.2 2.7-.5" />
    </svg>
  );
}

export function EditorSettings({
  page,
  dangerZone,
  onChanged,
}: EditorSettingsProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const changePasswordButtonRef = useRef<HTMLButtonElement>(null);
  const removePasswordButtonRef = useRef<HTMLButtonElement>(null);
  const [password, setPassword] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(
    page.passwordProtected,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [removePasswordOpen, setRemovePasswordOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const passwordMutation = useMutation<
    { passwordProtected: boolean },
    WebApiError,
    string | null
  >({
    mutationFn: (value) => setPagePassword(page.id, { password: value }),
    onSuccess: (result, value) => {
      void queryClient.invalidateQueries({
        queryKey: pageKeys.detail(page.id),
      });
      setPasswordProtected(result.passwordProtected);
      setPassword("");
      setShowPassword(false);
      setChangingPassword(false);
      setRemovePasswordOpen(false);
      setFeedback({
        message:
          value === null
            ? "Password removed. The letter no longer requires one."
            : passwordProtected
              ? "Password changed. Visitors must use the new password."
              : "Password added. Visitors now need it to open the letter.",
        error: false,
      });
    },
    onError: (error, value) => {
      if (value !== null) {
        setFeedback({ message: error.message, error: true });
      }
    },
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

  function confirmRemovePassword(): void {
    setFeedback(null);
    passwordMutation.mutate(null);
  }

  function cancelChangePassword(): void {
    setChangingPassword(false);
    setPassword("");
    setShowPassword(false);
    setFeedback(null);
    passwordMutation.reset();
    window.requestAnimationFrame(() =>
      changePasswordButtonRef.current?.focus(),
    );
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

  const hasPublicLink =
    page.status === "PUBLISHED" && Boolean(page.canonicalUrl);

  return (
    <section className={styles.panel} aria-labelledby="settings-title">
      <header className={styles.heading}>
        <div>
          <h2 id="settings-title">Letter settings</h2>
          <p>Manage your password and public link.</p>
        </div>
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
        <section className={styles.section} aria-labelledby="password-title">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon}>
              <LockIcon />
            </span>
            <div className={styles.passwordHeadingContent}>
              <h3 id="password-title">Password</h3>
              <p>
                {passwordProtected
                  ? "Visitors need this password and your link to read the letter."
                  : "Add a password if the link alone should not open the letter."}
              </p>
              <span className={styles.passwordStatus}>
                {passwordProtected ? "Password protected" : "No password"}
              </span>
            </div>
          </div>

          {!passwordProtected || changingPassword ? (
            <form className={styles.passwordForm} onSubmit={savePassword}>
              <label htmlFor="letter-password">
                {passwordProtected ? "New password" : "Enter a password"}
              </label>
              <div className={styles.passwordRow}>
                <div className={styles.passwordInput}>
                  <input
                    ref={passwordInputRef}
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
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
                <div className={styles.passwordFormActions}>
                  {passwordProtected ? (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      disabled={passwordMutation.isPending}
                      onClick={cancelChangePassword}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className={styles.primaryButton}
                    type="submit"
                    disabled={passwordMutation.isPending}
                    aria-busy={passwordMutation.isPending}
                  >
                    {passwordMutation.isPending
                      ? "Saving..."
                      : passwordProtected
                        ? "Save new password"
                        : "Add password"}
                  </button>
                </div>
              </div>
              <p id="letter-password-help" className={styles.helpText}>
                {passwordProtected
                  ? "Visitors who already unlocked the letter will need the new password."
                  : "The saved password is never shown here again."}
              </p>
            </form>
          ) : (
            <div className={styles.passwordActions}>
              <button
                ref={changePasswordButtonRef}
                className={styles.secondaryButton}
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() => {
                  passwordMutation.reset();
                  setFeedback(null);
                  setChangingPassword(true);
                  window.requestAnimationFrame(() =>
                    passwordInputRef.current?.focus(),
                  );
                }}
              >
                Change password
              </button>
              <button
                ref={removePasswordButtonRef}
                className={styles.dangerButton}
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() => {
                  passwordMutation.reset();
                  setFeedback(null);
                  setRemovePasswordOpen(true);
                }}
              >
                Remove password
              </button>
              <p className={styles.helpText}>
                The saved password cannot be viewed.
              </p>
            </div>
          )}
        </section>

        <section className={styles.linkSection} aria-labelledby="link-title">
          <div className={styles.sideHeading}>
            <span className={styles.sectionIcon}>
              <LinkIcon />
            </span>
            <div>
              <h3 id="link-title">Public link</h3>
              <p>
                {hasPublicLink
                  ? "Share this address with the people you want to reach."
                  : "Your link will be available here once you publish."}
              </p>
            </div>
          </div>
          {hasPublicLink ? (
            <>
              <input
                className={styles.linkValue}
                type="text"
                value={page.canonicalUrl ?? ""}
                aria-label="Public link"
                readOnly
              />
              <div className={styles.linkActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => void copyPublicLink()}
                >
                  <CopyIcon />
                  Copy link
                </button>
                <Link
                  className={styles.textLink}
                  href={"/p/" + page.slug}
                  target="_blank"
                  rel="noreferrer"
                >
                  <OpenIcon />
                  Open letter
                </Link>
              </div>
            </>
          ) : null}
        </section>

        {page.status === "PUBLISHED" || dangerZone ? (
          <section
            className={styles.manageSection}
            aria-labelledby="danger-zone-title"
          >
            <div className={styles.dangerHeading}>
              <span className={styles.dangerIcon}>
                <WarningIcon />
              </span>
              <div>
                <h3 id="danger-zone-title">Danger zone</h3>
                <p>Manage public access or permanently delete this letter.</p>
              </div>
            </div>
            {page.status === "PUBLISHED" ? (
              <div className={styles.manageAction}>
                <span className={styles.actionIcon}>
                  <UnpublishIcon />
                </span>
                <div>
                  <h4>Unpublish letter</h4>
                  <p>
                    Stop visits through the public link. Your letter and replies
                    stay saved.
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
      <AlertDialog.Root
        open={removePasswordOpen}
        onOpenChange={(open) => {
          if (!passwordMutation.isPending) setRemovePasswordOpen(open);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={styles.confirmOverlay} />
          <AlertDialog.Content
            className={styles.confirmDialog}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (removePasswordButtonRef.current) {
                removePasswordButtonRef.current.focus();
              } else {
                passwordInputRef.current?.focus();
              }
            }}
          >
            <AlertDialog.Title className={styles.confirmTitle}>
              Remove the password?
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.confirmDescription}>
              This letter will no longer ask visitors for a password. Anyone
              with its link can open it while it is published.
            </AlertDialog.Description>
            {passwordMutation.error ? (
              <p className={styles.confirmError} role="alert">
                {passwordMutation.error.message}
              </p>
            ) : null}
            <div className={styles.confirmActions}>
              <AlertDialog.Cancel asChild>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={passwordMutation.isPending}
                >
                  Keep password
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  className={styles.confirmRemoveButton}
                  type="button"
                  disabled={passwordMutation.isPending}
                  aria-busy={passwordMutation.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    confirmRemovePassword();
                  }}
                >
                  {passwordMutation.isPending
                    ? "Removing..."
                    : "Remove password"}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
