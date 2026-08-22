import { forwardRef, type InputHTMLAttributes } from "react";
import styles from "./ui.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  loading?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, loading = false, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={[styles.input, className].filter(Boolean).join(" ")}
      data-invalid={invalid || undefined}
      data-loading={loading || undefined}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
    />
  );
});
