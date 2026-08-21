import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

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
      className={[styles.card, className].filter(Boolean).join(" ")}
    >
      {children}
      {state ? <div className={styles.cardState}>{state}</div> : null}
    </Component>
  );
}
