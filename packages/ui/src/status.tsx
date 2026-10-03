import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/utils";

export interface StatusProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
  loading?: ReactNode;
  recovery?: ReactNode;
  state?: "idle" | "loading" | "empty" | "error";
}

export function Status({
  children,
  className,
  empty,
  error,
  loading,
  recovery,
  state = "idle",
  ...props
}: StatusProps): React.JSX.Element | null {
  if (state === "idle") return children ? <>{children}</> : null;

  const content =
    state === "loading" ? loading : state === "empty" ? empty : error;
  const actionableError = state === "error" && Boolean(recovery);

  return (
    <div
      {...props}
      className={cn(
        "grid gap-3 rounded-medium border border-border bg-surface-muted p-5 text-ink [overflow-wrap:anywhere] data-[state=error]:border-error data-[state=error]:text-error",
        className,
      )}
      data-state={state}
      role={actionableError ? "alert" : "status"}
      aria-live={actionableError ? "assertive" : "polite"}
    >
      <span
        aria-hidden="true"
        className="inline-block size-4 rounded-round border-solid border-[length:var(--letterly-focus-width)] border-current data-[state=loading]:border-r-transparent data-[state=error]:bg-current"
        data-state={state}
      />
      {content}
      {recovery ? <div className="justify-self-start">{recovery}</div> : null}
    </div>
  );
}
