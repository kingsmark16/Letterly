import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-target min-w-[var(--letterly-target-min)] items-center justify-center gap-2 rounded-medium border border-transparent text-small font-bold cursor-pointer transition-[background-color,border-color,color,transform] duration-fast ease-standard focus-visible:outline-solid focus-visible:outline-[length:var(--letterly-focus-width)] focus-visible:outline-focus focus-visible:outline-offset-[var(--letterly-focus-offset)] motion-safe:enabled:active:[transform:scale(var(--letterly-control-active-scale))] disabled:border-border disabled:bg-surface-muted disabled:text-ink-muted disabled:cursor-not-allowed disabled:transform-none data-[loading=true]:cursor-wait motion-reduce:duration-[var(--letterly-motion-reduced)]",
  {
    variants: {
      variant: {
        primary: "bg-wine text-surface hover:bg-wine-hover",
        secondary: "border-border bg-surface text-ink hover:text-wine",
        tertiary:
          "bg-transparent text-wine underline underline-offset-[var(--letterly-link-underline-offset)]",
        ghost: "bg-transparent text-ink hover:bg-surface-muted",
      },
      size: {
        default: "px-5 py-3",
        sm: "px-3 py-2",
        icon: "px-2 py-2",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
  state?: ReactNode;
  variant?: NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
  size?: NonNullable<VariantProps<typeof buttonVariants>["size"]>;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      disabled,
      loading = false,
      loadingLabel = "Loading",
      state,
      variant = "primary",
      size = "default",
      ...props
    },
    ref,
  ): React.JSX.Element {
    return (
      <>
        <button
          {...props}
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          data-slot="button"
          data-size={size}
          data-loading={loading || undefined}
          data-variant={variant}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
        >
          {children}
          {state ? <span>{state}</span> : null}
        </button>
        {loading ? (
          <span aria-live="polite" className="sr-only" role="status">
            {loadingLabel}
          </span>
        ) : null}
      </>
    );
  },
);
