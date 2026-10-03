import { forwardRef, type TextareaHTMLAttributes } from "react";
import { textControlClasses } from "./lib/control-styles";
import { cn } from "./lib/utils";

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
          className={cn(
            textControlClasses,
            "min-h-[var(--letterly-textarea-min-height)] resize-y",
            className,
          )}
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
