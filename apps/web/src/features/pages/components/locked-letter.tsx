"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { unlockPublicPage, WebApiError } from "../../../lib/api-client";
import { SecretLetterRenderer } from "../../../templates/secret-letter";

type LockedLetterProps = {
  slug: string;
  recipientName?: string;
};

export function LockedLetter({
  slug,
  recipientName,
}: LockedLetterProps): React.JSX.Element {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setErrorMessage(null);

    try {
      await unlockPublicPage(slug, password);
      setPassword("");
      setPending(false);
      router.replace(
        `/p/${encodeURIComponent(slug)}?opening=1#letter-content`,
        {
          scroll: true,
        },
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof WebApiError
          ? error.message
          : "The letter could not be unlocked. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <SecretLetterRenderer
      locked
      recipientName={recipientName}
      openingContent={
        <section
          aria-labelledby="locked-letter-title"
          data-unlock-card
          data-unlock-state={errorMessage ? "error" : "ready"}
        >
          <div data-unlock-copy>
            <p data-unlock-kicker>Private letter</p>
            <h1 id="locked-letter-title" data-unlock-title>
              This letter is protected.
            </h1>
            <p data-unlock-intro>These words are sealed for you.</p>
            <form data-unlock-form onSubmit={submit}>
              <label data-unlock-label htmlFor="letter-password">
                Password
                <span data-unlock-field>
                  <span data-unlock-field-mark aria-hidden="true">
                    ✦
                  </span>
                  <input
                    autoComplete="current-password"
                    id="letter-password"
                    name="password"
                    data-password-input
                    spellCheck={false}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    required
                    aria-describedby={
                      errorMessage ? "letter-password-error" : undefined
                    }
                    aria-invalid={errorMessage ? true : undefined}
                  />
                  <button
                    data-password-toggle
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
              {errorMessage ? (
                <p data-unlock-error id="letter-password-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <button
                data-unlock-submit
                type="submit"
                disabled={pending}
                aria-busy={pending}
              >
                <span>{pending ? "Unlocking…" : "Unlock letter"}</span>
              </button>
            </form>
          </div>
        </section>
      }
    />
  );
}
