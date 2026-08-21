import type { AnchorHTMLAttributes } from "react";
import styles from "./ui.module.css";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
}

export function Link({
  className,
  rel,
  target,
  ...props
}: LinkProps): React.JSX.Element {
  const safeRel = target === "_blank" ? (rel ?? "noopener noreferrer") : rel;

  return (
    <a
      {...props}
      className={[styles.link, className].filter(Boolean).join(" ")}
      rel={safeRel}
      target={target}
    />
  );
}
