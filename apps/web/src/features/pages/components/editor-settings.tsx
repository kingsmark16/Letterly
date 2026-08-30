"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import { setPagePassword, type WebApiError } from "../../../lib/api-client";
import styles from "./editor-settings.module.css";

interface EditorSettingsProps {
  page: OwnerPageProjection;
  dangerZone?: React.ReactNode;
}

export function EditorSettings({
  page,
  dangerZone,
}: EditorSettingsProps): React.JSX.Element {
  const [password, setPassword] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(
    page.passwordProtected,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const passwordMutation = useMutation({
    mutationFn: (value: string | null) =>
      setPagePassword(page.id, { password: value }),
    onSuccess: (result) => {
      setPasswordProtected(result.passwordProtected);
      setPassword("");
      setStatusMessage(
        result.passwordProtected
          ? "Password protection is now on."
          : "Password protection is now off.",
      );
    },
    onError: (error: WebApiError) => setStatusMessage(error.message),
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

  return (
    <section className={styles.panel} aria-labelledby="settings-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Letter settings</p>
          <h2 id="settings-title">Make the details feel like you</h2>
          <p>
            Style and privacy choices stay with this letter. You can change
            access at any time before or after publishing.
          </p>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="design-style-title">
        <h3 id="design-style-title">Design and style</h3>
        <div className={styles.settingsGrid}>
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
          This template keeps its warm paper style. More style choices will be
          available as the template catalog grows.
        </p>
      </section>

      <section
        className={styles.section}
        aria-labelledby="privacy-access-title"
      >
        <h3 id="privacy-access-title">Privacy and access</h3>
        <div className={styles.settingRow}>
          <div>
            <h4>Private responses</h4>
            <p>
              {page.settings.responsesEnabled
                ? "Visitors can answer the questions on this letter."
                : "Add a question in Content to enable private responses."}
            </p>
          </div>
          <span className={styles.stateBadge}>
            {page.settings.responsesEnabled ? "Enabled" : "Off"}
          </span>
        </div>

        <div className={styles.settingRow}>
          <div>
            <h4>Password protection</h4>
            <p>
              Require a password before anyone can read the published letter.
            </p>
          </div>
          <span className={styles.stateBadge}>
            {passwordProtected ? "Enabled" : "Not set"}
          </span>
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
                placeholder="Enter a private password"
                autoComplete="new-password"
                maxLength={256}
                aria-describedby="letter-password-help"
              />
              <button
                className={styles.passwordToggle}
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
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
          <p className={styles.helpText} id="letter-password-help">
            Letterly stores an encrypted version. Never share a password in the
            letter itself.
          </p>
          {passwordProtected ? (
            <button
              className={styles.textButton}
              type="button"
              onClick={removePassword}
            >
              Remove password protection
            </button>
          ) : null}
        </form>
        {statusMessage ? (
          <p className={styles.feedback} role="status">
            {statusMessage}
          </p>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="sharing-title">
        <h3 id="sharing-title">Sharing</h3>
        <div className={styles.linkRow}>
          <div>
            <span>Public link</span>
            <strong>{page.canonicalUrl ?? "Available after publishing"}</strong>
          </div>
          {page.canonicalUrl ? (
            <Link className={styles.secondaryButton} href={`/p/${page.slug}`}>
              Open letter
            </Link>
          ) : null}
        </div>
      </section>

      {dangerZone ? (
        <section
          className={styles.dangerSection}
          aria-labelledby="danger-title"
        >
          <h3 id="danger-title">Danger zone</h3>
          {dangerZone}
        </section>
      ) : null}
    </section>
  );
}
