import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/utils";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  className?: string;
  children: ReactNode;
  as?: "article" | "section";
  state?: ReactNode;
}

export function Card({
  as = "article",
  children,
  className,
  state,
  ...props
}: CardProps): React.JSX.Element {
  const Component = as;
  return (
    <Component
      {...props}
      data-slot="card"
      className={cn(
        "[overflow-wrap:anywhere] rounded-medium border border-border bg-surface p-5 text-ink shadow-low",
        className,
      )}
    >
      {children}
      {state ? <div className="mt-4">{state}</div> : null}
    </Component>
  );
}
