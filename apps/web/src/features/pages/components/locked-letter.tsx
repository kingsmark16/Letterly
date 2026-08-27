"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { unlockPublicPage, WebApiError } from "../../../lib/api-client";

type LockedLetterProps = { slug: string };

export function LockedLetter({ slug }: LockedLetterProps): React.JSX.Element {
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
      router.refresh();
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
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-9 text-ink">
      <section className="w-full max-w-xl rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
        <p className="mb-3 text-label font-bold uppercase tracking-[0.14em] text-wine">
          Private letter
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          This letter is protected.
        </h1>
        <p className="mt-5 text-body-large leading-relaxed text-ink-muted">
          Enter the password shared by the creator to continue.
        </p>
        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <label
            className="grid gap-2 text-small font-bold"
            htmlFor="letter-password"
          >
            Password
            <span className="relative block">
              <input
                autoComplete="current-password"
                className="min-h-11 w-full rounded-medium border border-border bg-surface px-4 py-3 pr-16 text-body font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                id="letter-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="absolute inset-y-0 right-2 min-h-11 px-2 text-small font-bold text-ink-muted hover:text-wine"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          {errorMessage ? (
            <p className="text-small text-wine" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Unlocking..." : "Unlock letter"}
          </button>
        </form>
      </section>
    </main>
  );
}
