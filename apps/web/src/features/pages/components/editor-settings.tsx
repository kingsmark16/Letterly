"use client";

import { useMutation } from "@tanstack/react-query";
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
import type { QuestionReadiness } from "./editor-overview";
import styles from "./editor-settings.module.css";

interface EditorSettingsProps {
  page: OwnerPageProjection;
  questionReadiness: QuestionReadiness;
  dangerZone?: React.ReactNode;
  onChanged: (response: PageLifecycleResponse) => void;
}

function formatStatus(status: OwnerPageProjection["status"]): string {
  const labels: Record<OwnerPageProjection["status"], string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    UNPUBLISHED: "Unpublished",
    ARCHIVED: "Archived",
  };

  return labels[status];
}

function LockIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function SearchIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m16 16 4.5 4.5" />
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

function MailIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m5 7 7 5 7-5" />
    </svg>
  );
}

function ClockIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function LinkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m10 13 4-4" />
      <path d="m7.5 16.5-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" />
      <path d="m16.5 7.5 1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function UnpublishIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 4v10m0-10 3 3m-3-3L9 7" />
      <path d="M5 11v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function StatusSwitch({
  state,
}: {
  state: "on" | "off" | "neutral";
}): React.JSX.Element {
  return (
    <span
      className={`${styles.switch} ${
        state === "on"
          ? styles.switchOn
          : state === "off"
            ? styles.switchOff
            : styles.switchNeutral
      }`}
      aria-hidden="true"
    >
      <span />
    </span>
  );
}

function SettingIcon({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <span className={styles.settingIcon}>{children}</span>;
}

export function EditorSettings({
  page,
  questionReadiness,
  dangerZone,
  onChanged,
}: EditorSettingsProps): React.JSX.Element {
  const [password, setPassword] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(
    page.passwordProtected,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const passwordMutation = useMutation<
    { passwordProtected: boolean },
    WebApiError,
    string | null
  >({
    mutationFn: (value) => setPagePassword(page.id, { password: value }),
    onSuccess: (result) => {
      setPasswordProtected(result.passwordProtected);
      setPassword("");
      setShowPassword(false);
      setStatusMessage(
        result.passwordProtected
          ? "Password protection is now on."
          : "Password protection is now off.",
      );
    },
    onError: (error) => setStatusMessage(error.message),
  });
  const unpublishMutation = useMutation<
    PageLifecycleResponse,
    WebApiError,
    { confirm: true }
  >({
    mutationFn: (input) => unpublishPage(page.id, input),
    onSuccess: (response) => {
      setStatusMessage(
        "Your letter is unpublished. The public link is unavailable.",
      );
      onChanged(response);
    },
    onError: (error) => setStatusMessage(error.message),
  });

  function savePassword(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = password.trim();
    if (!value) {
      setStatusMessage("Enter a password before saving.");
      return;
    }

    setStatusMessage(null);
    passwordMutation.mutate(value);
  }

  function removePassword(): void {
    if (!window.confirm("Remove password protection from this letter?")) return;
    setStatusMessage(null);
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

    setStatusMessage(null);
    unpublishMutation.mutate({ confirm: true });
  }

  async function copyPublicLink(): Promise<void> {
    if (!page.canonicalUrl || !navigator.clipboard) {
      setStatusMessage(
        "Copy is unavailable until this letter has a public link.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(page.canonicalUrl);
      setStatusMessage("The public link is copied to your clipboard.");
    } catch {
      setStatusMessage(
        "Copy was unavailable. Use Open letter to copy the address manually.",
      );
    }
  }

  const responseStatus = getResponseStatus(page, questionReadiness);
  const responseSwitchState: "on" | "off" | "neutral" =
    questionReadiness.isLoading || questionReadiness.isError
      ? "neutral"
      : page.status === "PUBLISHED" && questionReadiness.questionCount > 0
        ? "on"
        : "off";
  const statusIsError = passwordMutation.isError || unpublishMutation.isError;
  const publicLinkValue = page.canonicalUrl ?? "Available after publishing";
  const pageStatus = formatStatus(page.status);

  return (
    <section className={styles.panel} aria-labelledby="settings-title">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Settings</p>
          <h2 id="settings-title">Control access and privacy</h2>
          <p>
            Choose how visitors open, read, and respond to your letter. Every
            available change is saved for this letter only.
          </p>
        </div>
        <span className={styles.statusBadge}>{pageStatus}</span>
      </header>

      <div className={styles.settingsGrid}>
        <div className={styles.primaryColumn}>
          <section className={styles.section} aria-labelledby="access-title">
            <h3 id="access-title">Access protection</h3>

            <div className={styles.settingRow}>
              <SettingIcon>
                <LockIcon />
              </SettingIcon>
              <div className={styles.settingCopy}>
                <h4>Password protection</h4>
                <p>Require a password before visitors can open this letter.</p>
              </div>
              <div className={styles.settingState}>
                <span>{passwordProtected ? "Enabled" : "Not set"}</span>
                <StatusSwitch state={passwordProtected ? "on" : "off"} />
              </div>
            </div>

            <form className={styles.passwordForm} onSubmit={savePassword}>
              <label htmlFor="letter-password">Set or replace password</label>
              <div className={styles.passwordRow}>
                <div className={styles.passwordInput}>
                  <input
                    id="letter-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      passwordProtected
                        ? "Enter a new password"
                        : "Enter a private password"
                    }
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
                  className={styles.secondaryButton}
                  type="submit"
                  disabled={passwordMutation.isPending}
                  aria-busy={passwordMutation.isPending}
                >
                  {passwordMutation.isPending
                    ? "Saving..."
                    : passwordProtected
                      ? "Change password"
                      : "Save password"}
                </button>
              </div>
              <p className={styles.helpText} id="letter-password-help">
                {passwordProtected
                  ? "Enter a new password to replace the current one. The saved password is never shown."
                  : "Anyone with the link will also need this password. Letterly stores an encrypted version."}
              </p>
              {passwordProtected ? (
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={removePassword}
                  disabled={passwordMutation.isPending}
                >
                  Remove password protection
                </button>
              ) : null}
            </form>

            <div className={styles.settingRow}>
              <SettingIcon>
                <SearchIcon />
              </SettingIcon>
              <div className={styles.settingCopy}>
                <h4>Search engine visibility</h4>
                <p>Allow this letter to appear in search results.</p>
                <span className={styles.mutedLine}>Hidden from search</span>
              </div>
              <div className={styles.settingState}>
                <span className={styles.mutedLine}>Off</span>
                <StatusSwitch state="off" />
                <span className={styles.comingSoon}>Coming soon</span>
              </div>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="visitor-title">
            <h3 id="visitor-title">Visitor experience</h3>

            <div className={styles.settingRow}>
              <SettingIcon>
                <MessageIcon />
              </SettingIcon>
              <div className={styles.settingCopy}>
                <h4>Allow visitor responses</h4>
                <p>{responseStatus.description}</p>
              </div>
              <div className={styles.settingState}>
                <span>{responseStatus.label}</span>
                <StatusSwitch state={responseSwitchState} />
              </div>
            </div>
            {responseStatus.retry ? (
              <button
                className={styles.textButton}
                type="button"
                onClick={questionReadiness.onRetry}
              >
                Retry question status
              </button>
            ) : null}

            <div className={`${styles.settingRow} ${styles.unavailableRow}`}>
              <SettingIcon>
                <MailIcon />
              </SettingIcon>
              <div className={styles.settingCopy}>
                <h4>Response notifications</h4>
                <p>Email me when someone responds.</p>
              </div>
              <span className={styles.comingSoon}>Coming soon</span>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="style-title">
            <h3 id="style-title">Letter style</h3>
            <div className={styles.styleFields}>
              <label>
                Theme
                <select value={page.settings.theme} disabled aria-label="Theme">
                  <option>{page.settings.theme}</option>
                </select>
              </label>
              <label>
                Font style
                <select
                  value={page.settings.fontStyle}
                  disabled
                  aria-label="Font style"
                >
                  <option>{page.settings.fontStyle}</option>
                </select>
              </label>
            </div>
            <p className={styles.helpText}>
              More style choices will be available as the template catalog
              grows.
            </p>
          </section>
        </div>

        <div className={styles.secondaryColumn}>
          <section
            className={styles.availabilitySection}
            aria-labelledby="availability-title"
          >
            <h3 id="availability-title">Letter availability</h3>
            <div className={styles.availabilityRow}>
              <SettingIcon>
                <ClockIcon />
              </SettingIcon>
              <div className={styles.settingCopy}>
                <h4>Keep letter published</h4>
                <p>
                  {page.status === "PUBLISHED"
                    ? "Your letter remains public until you unpublish it."
                    : "Publish this letter from Overview to make it available."}
                </p>
              </div>
              <select
                className={styles.availabilitySelect}
                value={
                  page.status === "PUBLISHED"
                    ? "until-unpublish"
                    : "publish-overview"
                }
                disabled
                aria-label="Letter availability"
              >
                <option value="until-unpublish">Until I unpublish it</option>
                <option value="publish-overview">Publish from Overview</option>
              </select>
            </div>

            <div className={styles.publicLinkRow}>
              <SettingIcon>
                <LinkIcon />
              </SettingIcon>
              <label className={styles.publicLinkField} htmlFor="public-link">
                Public link
                <input
                  id="public-link"
                  value={publicLinkValue}
                  readOnly
                  aria-describedby="public-link-help"
                />
              </label>
              <div className={styles.linkActions}>
                <button
                  className={styles.iconButton}
                  type="button"
                  disabled={!page.canonicalUrl}
                  onClick={() => void copyPublicLink()}
                  aria-label="Copy public link"
                >
                  Copy
                </button>
                {page.canonicalUrl ? (
                  <Link
                    className={styles.iconButton}
                    href={`/p/${page.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            </div>
            <p className={styles.visuallyHidden} id="public-link-help">
              {page.canonicalUrl
                ? "This is the current canonical public link for your letter."
                : "A public link becomes available after publishing."}
            </p>
          </section>

          <section
            className={styles.summarySection}
            aria-labelledby="summary-title"
          >
            <h3 id="summary-title">Access summary</h3>
            <dl className={styles.summaryList}>
              <div>
                <dt>
                  <CheckIcon />
                  Status
                </dt>
                <dd
                  className={
                    page.status === "PUBLISHED" ? styles.successText : ""
                  }
                >
                  {pageStatus}
                </dd>
              </div>
              <div>
                <dt>
                  <LockIcon />
                  Protection
                </dt>
                <dd>
                  {passwordProtected ? "Password required" : "No password"}
                </dd>
              </div>
              <div>
                <dt>
                  <SearchIcon />
                  Search visibility
                </dt>
                <dd>Hidden / Coming soon</dd>
              </div>
            </dl>
          </section>

          <section
            className={styles.dangerSection}
            aria-labelledby="danger-title"
          >
            <h3 id="danger-title">Danger zone</h3>
            <div className={styles.dangerRow}>
              <SettingIcon>
                <UnpublishIcon />
              </SettingIcon>
              <div className={styles.settingCopy}>
                <h4>Unpublish letter</h4>
                <p>
                  Removes public access immediately. Your content and private
                  responses will be kept.
                </p>
              </div>
              {page.status === "PUBLISHED" ? (
                <button
                  className={styles.dangerOutlineButton}
                  type="button"
                  disabled={unpublishMutation.isPending}
                  aria-busy={unpublishMutation.isPending}
                  onClick={handleUnpublish}
                >
                  {unpublishMutation.isPending
                    ? "Unpublishing..."
                    : "Unpublish"}
                </button>
              ) : (
                <span className={styles.disabledAction}>Not published</span>
              )}
            </div>

            {dangerZone ? (
              <div className={styles.dangerDivider}>{dangerZone}</div>
            ) : null}
          </section>
        </div>
      </div>

      {statusMessage ? (
        <p
          className={`${styles.feedback} ${statusIsError ? styles.feedbackError : ""}`}
          role={statusIsError ? "alert" : "status"}
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}

function getResponseStatus(
  page: OwnerPageProjection,
  readiness: QuestionReadiness,
): { label: string; description: string; retry: boolean } {
  if (readiness.isLoading) {
    return {
      label: "Loading...",
      description: "Checking the questions on this letter.",
      retry: false,
    };
  }
  if (readiness.isError) {
    return {
      label: "Unavailable",
      description: "We could not confirm response readiness.",
      retry: true,
    };
  }
  if (page.status === "ARCHIVED") {
    return {
      label: "Unavailable while archived",
      description: "Archived letters do not accept new private responses.",
      retry: false,
    };
  }
  if (readiness.isUpdating) {
    return {
      label: "Updating...",
      description: "Confirming the latest question changes.",
      retry: false,
    };
  }
  if (readiness.questionCount === 0) {
    return {
      label: "Add a question",
      description: "Add a question in Content to enable private responses.",
      retry: false,
    };
  }
  return page.status === "PUBLISHED"
    ? {
        label: "Enabled automatically",
        description: "Visitors can answer the questions on this letter.",
        retry: false,
      }
    : {
        label: "Ready when published",
        description:
          "Private responses will be available when this letter is published.",
        retry: false,
      };
}
