import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "main" | "section" | "article";
  children: ReactNode;
  size?: "content" | "wide" | "full";
}

export function Container({
  as = "div",
  children,
  className,
  size = "wide",
  ...props
}: ContainerProps): React.JSX.Element {
  const Component = as;
  return (
    <Component
      {...props}
      className={[styles.container, className].filter(Boolean).join(" ")}
      data-size={size}
    >
      {children}
    </Component>
  );
}
