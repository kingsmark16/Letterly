import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/utils";

const containerSizes = {
  content: "max-w-[var(--letterly-content-max)]",
  wide: "max-w-[var(--letterly-container-max)]",
  full: "max-w-none",
} as const;

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
      className={cn(
        "mx-auto w-[min(100%,var(--letterly-container-max))] px-5 tablet:px-6 desktop:px-7",
        containerSizes[size],
        className,
      )}
      data-size={size}
    >
      {children}
    </Component>
  );
}
