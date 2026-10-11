import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonVariants } from "./button";
import { cn } from "./lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  loading?: boolean;
}

export function IconButton({
  className,
  icon,
  label,
  loading = false,
  ...props
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      {...props}
      className={cn(
        buttonVariants({ variant: "secondary", size: "icon" }),
        "w-[var(--letterly-target-min)] rounded-round",
        className,
      )}
      aria-label={props["aria-label"] ?? label}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      disabled={props.disabled || loading}
      type={props.type ?? "button"}
    >
      <span
        aria-hidden="true"
        className="block size-5 shrink-0 [&>svg]:size-full"
      >
        {icon}
      </span>
    </button>
  );
}
