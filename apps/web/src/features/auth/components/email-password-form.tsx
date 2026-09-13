"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_PUBLIC_MESSAGES,
  signInEmailRequestSchema,
  signUpEmailRequestSchema,
  type SignInEmailRequest,
  type SignUpEmailRequest,
} from "@letterly/contracts/auth";
import { authClient } from "../../../lib/auth-client";
import { createSignInPath } from "../../../lib/return-path";
import styles from "./sign-in-form.module.css";

export type EmailPasswordMode = "sign-in" | "sign-up";

interface EmailPasswordFormProps {
  mode: EmailPasswordMode;
  returnTo: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRateLimited(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.status === 429 ||
    value.statusCode === 429 ||
    value.code === "TOO_MANY_REQUESTS" ||
    value.code === "RATE_LIMITED"
  );
}

function getSafeErrorMessage(mode: EmailPasswordMode, error: unknown): string {
  if (isRateLimited(error)) {
    return AUTH_PUBLIC_MESSAGES.rateLimited;
  }

  return mode === "sign-in"
    ? AUTH_PUBLIC_MESSAGES.signInFailure
    : AUTH_PUBLIC_MESSAGES.signUpFailure;
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
  if (!message) {
    return null;
  }

  return (
    <p id={id} className={styles.fieldError} role="alert">
      {message}
    </p>
  );
}

function PasswordField({
  error,
  formId,
  helpText,
  label,
  passwordAutoComplete,
  register,
}: {
  error: string | undefined;
  formId: string;
  helpText: string;
  label: string;
  passwordAutoComplete: "current-password" | "new-password";
  register: UseFormRegisterReturn;
}): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = `${formId}-password`;
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
          autoComplete={passwordAutoComplete}
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
        {helpText}
      </p>
      <FieldError id={errorId} message={error} />
    </div>
  );
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
        We will use this to secure your account.
      </p>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function NameField({
  error,
  formId,
  register,
}: {
  error: string | undefined;
  formId: string;
  register: UseFormRegisterReturn;
}): React.JSX.Element {
  const inputId = `${formId}-name`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        Your name
      </label>
      <input
        className={styles.textInput}
        id={inputId}
        type="text"
        autoComplete="name"
        maxLength={80}
        aria-describedby={inputDescription(helpId, errorId, Boolean(error))}
        aria-invalid={Boolean(error)}
        {...register}
      />
      <p id={helpId} className={styles.fieldHelp}>
        This is how your Letterly workspace will greet you.
      </p>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function EmailSignInForm({
  returnTo,
}: {
  returnTo: string;
}): React.JSX.Element {
  const formId = useId();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<SignInEmailRequest>({
    resolver: zodResolver(signInEmailRequestSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInEmailRequest): Promise<void> {
    setServerError(null);

    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        setServerError(getSafeErrorMessage("sign-in", result.error));
        return;
      }

      router.replace(returnTo);
    } catch (error: unknown) {
      setServerError(getSafeErrorMessage("sign-in", error));
    }
  }

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form
      className={styles.emailForm}
      aria-busy={form.formState.isSubmitting}
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
    >
      <h3 className={styles.emailHeading}>Sign in with email</h3>
      <EmailField
        error={emailError}
        formId={formId}
        register={form.register("email")}
      />
      <PasswordField
        error={passwordError}
        formId={formId}
        helpText="Use the password you created for Letterly."
        label="Password"
        passwordAutoComplete="current-password"
        register={form.register("password")}
      />

      <div className={styles.authActions}>
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/forgot-password?mode=verification">
          Resend verification email
        </Link>
      </div>

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
        {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

function EmailSignUpForm({
  returnTo,
}: {
  returnTo: string;
}): React.JSX.Element {
  const formId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const form = useForm<SignUpEmailRequest>({
    resolver: zodResolver(signUpEmailRequestSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpEmailRequest): Promise<void> {
    setServerError(null);

    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        setServerError(getSafeErrorMessage("sign-up", result.error));
        return;
      }

      setCompleted(true);
    } catch (error: unknown) {
      setServerError(getSafeErrorMessage("sign-up", error));
    }
  }

  if (completed) {
    return (
      <div className={styles.successMessage} role="status" aria-live="polite">
        <h3>Check your email to continue.</h3>
        <p>
          If the address can receive mail, check its inbox for a verification
          link. After verification, return here to sign in.
        </p>
        <Link className={styles.emailSubmit} href={createSignInPath(returnTo)}>
          Continue to sign in
        </Link>
      </div>
    );
  }

  const nameError = form.formState.errors.name?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form
      className={styles.emailForm}
      aria-busy={form.formState.isSubmitting}
      noValidate
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
    >
      <h3 className={styles.emailHeading}>Use your email to get started</h3>
      <NameField
        error={nameError}
        formId={formId}
        register={form.register("name")}
      />
      <EmailField
        error={emailError}
        formId={formId}
        register={form.register("email")}
      />
      <PasswordField
        error={passwordError}
        formId={formId}
        helpText={`Use ${AUTH_PASSWORD_MIN_LENGTH}-${AUTH_PASSWORD_MAX_LENGTH} characters. A memorable phrase works well.`}
        label="Password"
        passwordAutoComplete="new-password"
        register={form.register("password")}
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
        {form.formState.isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export function EmailPasswordForm({
  mode,
  returnTo,
}: EmailPasswordFormProps): React.JSX.Element {
  return mode === "sign-in" ? (
    <EmailSignInForm returnTo={returnTo} />
  ) : (
    <EmailSignUpForm returnTo={returnTo} />
  );
}
