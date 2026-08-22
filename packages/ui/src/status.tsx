import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

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
      className={[styles.status, className].filter(Boolean).join(" ")}
      data-state={state}
      role={actionableError ? "alert" : "status"}
      aria-live={actionableError ? "assertive" : "polite"}
    >
      <span
        aria-hidden="true"
        className={styles.statusCue}
        data-state={state}
      />
      {content}
      {recovery ? (
        <div className={styles.statusRecovery}>{recovery}</div>
      ) : null}
    </div>
  );
}
