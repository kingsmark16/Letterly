import type { AnchorHTMLAttributes } from "react";
import { cn } from "./lib/utils";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
}

export function Link({
  className,
  rel,
  target,
  ...props
}: LinkProps): React.JSX.Element {
  const safeRel =
    target === "_blank"
      ? Array.from(
          new Set(["noopener", "noreferrer", ...(rel ?? "").split(/\s+/u)]),
        )
          .filter(Boolean)
          .join(" ")
      : rel;

  return (
    <a
      {...props}
      className={cn(
        "inline-flex min-h-target items-center text-inherit no-underline focus-visible:outline-solid focus-visible:outline-[length:var(--letterly-focus-width)] focus-visible:outline-focus focus-visible:outline-offset-[var(--letterly-focus-offset)]",
        className,
      )}
      rel={safeRel}
      target={target}
    />
  );
}
