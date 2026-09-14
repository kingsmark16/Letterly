import * as React from "react";
import { cn } from "cn";

function Card({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-large border border-border bg-surface text-ink shadow-low",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-2 p-5 sm:p-6", className)}
      {...props}
    />
  );
}

function CardTitle({
  as: Component = "h3",
  className,
  ...props
}: React.ComponentProps<"h3"> & {
  as?: "h2" | "h3" | "h4";
}): React.JSX.Element {
  return (
    <Component
      data-slot="card-title"
      className={cn(
        "font-display text-balance text-heading-3 font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">): React.JSX.Element {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 pb-5 sm:px-6 sm:pb-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
