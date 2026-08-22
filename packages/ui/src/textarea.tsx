import { forwardRef, type TextareaHTMLAttributes } from "react";
import styles from "./ui.module.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  characterCount?: React.ReactNode;
  invalid?: boolean;
  loading?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { characterCount, className, invalid = false, loading = false, ...props },
    ref,
  ) {
    return (
      <span>
        <textarea
          {...props}
          ref={ref}
          className={[styles.textarea, className].filter(Boolean).join(" ")}
          data-invalid={invalid || undefined}
          data-loading={loading || undefined}
          disabled={props.disabled || loading}
          aria-busy={loading || undefined}
        />
        {characterCount ? <span>{characterCount}</span> : null}
      </span>
    );
  },
);
