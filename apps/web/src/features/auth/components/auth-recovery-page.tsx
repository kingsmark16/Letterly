"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_PUBLIC_MESSAGES,
  emailOnlyAuthRequestSchema,
  resetPasswordFormSchema,
  type EmailOnlyAuthRequest,
  type ResetPasswordForm,
} from "@letterly/contracts/auth";
import { authClient } from "../../../lib/auth-client";
import { BrandLogo, SignInFooter } from "./sign-in-form";
import styles from "./sign-in-form.module.css";

export type AuthRecoveryMode = "password-reset" | "verification";

export interface AuthRecoveryPageProps {
  mode: AuthRecoveryMode | "verification-result" | "reset-form";
  hasError?: boolean;
  privacyContent: React.ReactNode;
  termsContent: React.ReactNode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorCode(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.code === "string") {
    return value.code;
  }

  return isRecord(value.body) && typeof value.body.code === "string"
    ? value.body.code
    : undefined;
}

function isRateLimited(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.status === 429 ||
    value.statusCode === 429 ||
    value.code === "TOO_MANY_REQUESTS" ||
    value.code === "AUTH_RATE_LIMITED"
  );
}

function getSafeRecoveryErrorMessage(error: unknown): string {
  if (isRateLimited(error)) {
    return AUTH_PUBLIC_MESSAGES.rateLimited;
  }

  if (getErrorCode(error) === "INVALID_RESET_TOKEN") {
    return AUTH_PUBLIC_MESSAGES.invalidResetToken;
  }

  return AUTH_PUBLIC_MESSAGES.genericFailure;
}

function inputDescription(
  helpId: string,
  errorId: string,
  hasError: boolean,
): string {
  return hasError ? `${helpId} ${errorId}` : helpId;
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}): React.JSX.Element | null {
  return message ? (
    <p id={id} className={styles.fieldError} role="alert">
      {message}
    </p>
  ) : null;
}

function EmailField({
  error,
  formId,
  register,
}: {
  error: string | undefined;
  formId: string;
  register: UseFormRegisterReturn;
}): React.JSX.Element {
  const inputId = `${formId}-email`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        Email address
      </label>
      <input
        className={styles.textInput}
        id={inputId}
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        aria-describedby={inputDescription(helpId, errorId, Boolean(error))}
        aria-invalid={Boolean(error)}
        {...register}
      />
      <p id={helpId} className={styles.fieldHelp}>
        We will use this only to send the requested account email.
      </p>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function PasswordField({
  error,
  formId,
  label,
  register,
}: {
  error: string | undefined;
  formId: string;
  label: string;
  register: UseFormRegisterReturn;
}): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = `${formId}-${label.toLowerCase().replaceAll(" ", "-")}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.passwordField}>
        <input
          className={styles.textInput}
          id={inputId}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          aria-describedby={inputDescription(helpId, errorId, Boolean(error))}
          aria-invalid={Boolean(error)}
          {...register}
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
      <p id={helpId} className={styles.fieldHelp}>
        Use {AUTH_PASSWORD_MIN_LENGTH}-{AUTH_PASSWORD_MAX_LENGTH} characters.
      </p>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function EmailActionForm({
  mode,
}: {
  mode: AuthRecoveryMode;
}): React.JSX.Element {
  const formId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const form = useForm<EmailOnlyAuthRequest>({
    resolver: zodResolver(emailOnlyAuthRequestSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { email: "" },
  });

  async function onSubmit(values: EmailOnlyAuthRequest): Promise<void> {
    setServerError(null);

    try {
      const result =
        mode === "verification"
          ? await authClient.sendVerificationEmail({ email: values.email })
          : await authClient.requestPasswordReset({ email: values.email });

      if (result.error) {
        setServerError(getSafeRecoveryErrorMessage(result.error));
        return;
      }

      setCompleted(true);
    } catch (error: unknown) {
      setServerError(getSafeRecoveryErrorMessage(error));
    }
  }

  if (completed) {
    return (
      <div className={styles.successMessage} role="status" aria-live="polite">
        <h3>Check your inbox.</h3>
        <p>{AUTH_PUBLIC_MESSAGES.emailActionRequested}</p>
        <Link className={styles.emailSubmit} href="/sign-in">
          Return to sign in
        </Link>
      </div>
    );
  }

  const emailError = form.formState.errors.email?.message;

  return (
    <form
      className={styles.emailForm}
      aria-busy={form.formState.isSubmitting}
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
    >
      <h2 className={styles.emailHeading}>
        {mode === "verification"
          ? "Resend your verification email"
          : "Request a password reset"}
      </h2>
      <EmailField
        error={emailError}
        formId={formId}
        register={form.register("email")}
      />

      {serverError ? (
        <p className={styles.errorMessage} role="alert">
          {serverError}
        </p>
      ) : null}

      <button
        className={styles.emailSubmit}
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting
          ? "Sending..."
          : mode === "verification"
            ? "Send verification email"
            : "Send reset email"}
      </button>
    </form>
  );
}

function ResetPasswordForm({
  hasError = false,
}: {
  hasError?: boolean;
}): React.JSX.Element {
  const formId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [token, setToken] = useState<string>();
  const [tokenCaptureComplete, setTokenCaptureComplete] = useState(false);
  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { newPassword: "", passwordConfirmation: "" },
  });

  useEffect(() => {
    function captureToken(): void {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const capturedToken =
        hashParams.get("token") ??
        url.searchParams.get("token") ??
        undefined;

      setToken(capturedToken);
      setTokenCaptureComplete(true);
      window.history.replaceState(null, document.title, "/reset-password");
    }

    captureToken();
    window.addEventListener("hashchange", captureToken);

    return () => {
      window.removeEventListener("hashchange", captureToken);
    };
  }, []);

  if (hasError || (tokenCaptureComplete && !token)) {
    return (
      <div className={styles.errorMessage} role="alert">
        {AUTH_PUBLIC_MESSAGES.invalidResetToken}
      </div>
    );
  }

  if (!tokenCaptureComplete) {
    return (
      <div className={styles.successMessage} role="status" aria-live="polite">
        Checking your reset link...
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordForm): Promise<void> {
    setServerError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: values.newPassword,
        token,
      });

      if (result.error) {
        setServerError(getSafeRecoveryErrorMessage(result.error));
        return;
      }

      setCompleted(true);
    } catch (error: unknown) {
      setServerError(getSafeRecoveryErrorMessage(error));
    }
  }

  if (completed) {
    return (
      <div className={styles.successMessage} role="status" aria-live="polite">
        <h3>Your password has been reset.</h3>
        <p>
          Your active Letterly sessions were signed out. Sign in again with your
          new password.
        </p>
        <Link className={styles.emailSubmit} href="/sign-in">
          Continue to sign in
        </Link>
      </div>
    );
  }

  const newPasswordError = form.formState.errors.newPassword?.message;
  const confirmationError = form.formState.errors.passwordConfirmation?.message;

  return (
    <form
      className={styles.emailForm}
      aria-busy={form.formState.isSubmitting}
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
    >
      <h2 className={styles.emailHeading}>Choose a new password</h2>
      <PasswordField
        error={newPasswordError}
        formId={formId}
        label="New password"
        register={form.register("newPassword")}
      />
      <PasswordField
        error={confirmationError}
        formId={formId}
        label="Confirm new password"
        register={form.register("passwordConfirmation")}
      />

      {serverError ? (
        <p className={styles.errorMessage} role="alert">
          {serverError}
        </p>
      ) : null}

      <button
        className={styles.emailSubmit}
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}

function VerificationResult({
  hasError,
}: {
  hasError: boolean;
}): React.JSX.Element {
  return (
    <div className={hasError ? styles.errorMessage : styles.successMessage}>
      <h3>{hasError ? "This link is no longer valid." : "Email verified."}</h3>
      <p>
        {hasError
          ? "Request a new verification email and use the newest link."
          : "Your email is verified. Sign in to continue to your Letterly workspace."}
      </p>
      <Link className={styles.emailSubmit} href="/sign-in">
        Continue to sign in
      </Link>
    </div>
  );
}

function getPageCopy(mode: AuthRecoveryPageProps["mode"]): {
  eyebrow: string;
  heading: string;
  copy: string;
} {
  switch (mode) {
    case "verification":
      return {
        eyebrow: "Email verification",
        heading: "Keep your Letterly account yours.",
        copy: "We will send a fresh verification link if the address can receive mail.",
      };
    case "verification-result":
      return {
        eyebrow: "Email verification",
        heading: "Your email, confirmed.",
        copy: "Verification is complete without signing you in automatically.",
      };
    case "reset-form":
      return {
        eyebrow: "Password recovery",
        heading: "Set a password you can trust.",
        copy: "Choose a new password for your Letterly account.",
      };
    case "password-reset":
      return {
        eyebrow: "Password recovery",
        heading: "Find your way back in.",
        copy: "We will email a one-hour password reset link if the address matches an account.",
      };
  }
}

export function AuthRecoveryPage({
  hasError = false,
  mode,
  privacyContent,
  termsContent,
}: AuthRecoveryPageProps): React.JSX.Element {
  const copy = getPageCopy(mode);

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${styles.mainSingle}`}>
        <section className={styles.panel} aria-labelledby="recovery-title">
          <div className={styles.panelBrand}>
            <BrandLogo compact />
            <span>LETTERLY ACCOUNT</span>
          </div>
          <p className={`${styles.eyebrow} ${styles.welcomeEyebrow}`}>
            {copy.eyebrow}
          </p>
          <h1 id="recovery-title">{copy.heading}</h1>
          <p className={styles.panelCopy}>{copy.copy}</p>

          {mode === "password-reset" || mode === "verification" ? (
            <EmailActionForm mode={mode} />
          ) : mode === "reset-form" ? (
            <ResetPasswordForm hasError={hasError} />
          ) : (
            <VerificationResult hasError={hasError} />
          )}

          <p className={styles.switchPrompt}>
            <Link href="/sign-in">Return to sign in</Link>
          </p>

          <div className={styles.privacyNote}>
            <span className={styles.privacyMark} aria-hidden="true">
              ✓
            </span>
            <p>
              Letterly does not publish anything for you. You stay in control of
              every page and every shared link.
            </p>
          </div>
        </section>
      </main>

      <SignInFooter
        privacyContent={privacyContent}
        termsContent={termsContent}
      />
    </div>
  );
}
