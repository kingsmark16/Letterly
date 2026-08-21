import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type SpaceToken = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end" | "stretch";
  children: ReactNode;
  direction?: "vertical" | "horizontal";
  gap?: SpaceToken;
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}

export function Stack({
  align,
  children,
  className,
  direction = "vertical",
  gap = 4,
  justify,
  style,
  wrap = false,
  ...props
}: StackProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={[styles.stack, className].filter(Boolean).join(" ")}
      data-direction={direction}
      data-gap={gap}
      data-wrap={wrap || undefined}
      style={{
        ...style,
        alignItems: align,
        justifyContent:
          justify === "between"
            ? "space-between"
            : justify === "start"
              ? "flex-start"
              : justify === "end"
                ? "flex-end"
                : justify,
        ["--stack-gap" as string]: `var(--letterly-space-${gap})`,
      }}
    >
      {children}
    </div>
  );
}
