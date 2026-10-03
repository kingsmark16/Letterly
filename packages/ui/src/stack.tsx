import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/utils";

type SpaceToken = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const stackGaps = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  7: "gap-7",
  8: "gap-8",
  9: "gap-9",
} as const satisfies Record<SpaceToken, string>;

const stackAlignments = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const stackJustifications = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

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
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row" : "flex-col",
        stackGaps[gap],
        align ? stackAlignments[align] : undefined,
        justify ? stackJustifications[justify] : undefined,
        wrap ? "flex-wrap" : undefined,
        className,
      )}
      data-direction={direction}
      data-gap={gap}
      data-wrap={wrap || undefined}
      style={style}
    >
      {children}
    </div>
  );
}
