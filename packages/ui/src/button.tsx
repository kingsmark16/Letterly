import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./ui.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
  state?: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      disabled,
      loading = false,
      loadingLabel = "Working",
      state,
      variant = "primary",
      ...props
    },
    ref,
  ): React.JSX.Element {
    return (
      <>
        <button
          {...props}
          ref={ref}
          className={[styles.button, className].filter(Boolean).join(" ")}
          data-loading={loading || undefined}
          data-variant={variant}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
        >
          {children}
          {state ? <span>{state}</span> : null}
        </button>
        {loading ? (
          <span
            aria-live="polite"
            className={styles.visuallyHidden}
            role="status"
          >
            {loadingLabel}
          </span>
        ) : null}
      </>
    );
  },
);
