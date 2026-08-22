import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

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
      className={[styles.iconButton, className].filter(Boolean).join(" ")}
      aria-label={props["aria-label"] ?? label}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      disabled={props.disabled || loading}
      type={props.type ?? "button"}
    >
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
    </button>
  );
}
