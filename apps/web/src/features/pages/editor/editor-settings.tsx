"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type {
  OwnerPageProjection,
  PageLifecycleResponse,
} from "@letterly/contracts/pages";
import { setPagePassword, unpublishPage } from "../api/lifecycle";
import { type WebApiError } from "../../../lib/api/errors";
import { pageKeys } from "../api/query-keys";
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
  return <Lock strokeWidth={1.7} aria-hidden="true" />;
}

function LinkIcon(): React.JSX.Element {
  return <Link2 strokeWidth={1.7} aria-hidden="true" />;
}

function EyeIcon({ hidden = false }: { hidden?: boolean }): React.JSX.Element {
  return hidden ? (
    <EyeOff strokeWidth={1.7} aria-hidden="true" />
  ) : (
    <Eye strokeWidth={1.7} aria-hidden="true" />
  );
}

function CopyIcon(): React.JSX.Element {
  return <Copy strokeWidth={1.7} aria-hidden="true" />;
}

function OpenIcon(): React.JSX.Element {
  return <ExternalLink strokeWidth={1.7} aria-hidden="true" />;
}

function WarningIcon(): React.JSX.Element {
  return <AlertTriangle strokeWidth={1.7} aria-hidden="true" />;
}

function UnpublishIcon(): React.JSX.Element {
  return <EyeOff strokeWidth={1.7} aria-hidden="true" />;
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
  const [unpublishOpen, setUnpublishOpen] = useState(false);
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
      setUnpublishOpen(false);
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
                  onClick={() => {
                    unpublishMutation.reset();
                    setUnpublishOpen(true);
                  }}
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
      <ConfirmationDialog
        open={removePasswordOpen}
        onOpenChange={setRemovePasswordOpen}
        title="Remove the password?"
        description="This letter will no longer ask visitors for a password. Anyone with its link can open it while it is published."
        confirmLabel="Remove password"
        cancelLabel="Keep password"
        pendingLabel="Removing..."
        pending={passwordMutation.isPending}
        error={passwordMutation.error?.message}
        onConfirm={confirmRemovePassword}
        restoreFocus={() => {
          if (removePasswordButtonRef.current) {
            removePasswordButtonRef.current.focus();
          } else {
            passwordInputRef.current?.focus();
          }
        }}
      />
      <ConfirmationDialog
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
        title="Unpublish this letter?"
        description="The public link will stop working immediately. Your letter and replies stay saved, and you can publish it again later."
        confirmLabel="Unpublish"
        cancelLabel="Keep published"
        pendingLabel="Unpublishing..."
        pending={unpublishMutation.isPending}
        error={unpublishMutation.error?.message}
        onConfirm={handleUnpublish}
      />
    </section>
  );
}
