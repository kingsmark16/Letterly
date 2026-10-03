"use client";

import {
  useEffect,
  useId,
  useRef,
  type DialogHTMLAttributes,
  type RefObject,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { cn } from "./lib/utils";

export interface DialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "onClose" | "title"
> {
  children: ReactNode;
  classNames?: Partial<
    Record<"content" | "header" | "title" | "description", string>
  >;
  closeLabel?: string;
  closeIconOnly?: boolean;
  closeOnOverlayClick?: boolean;
  description?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>;
}

export function Dialog({
  children,
  className,
  classNames,
  closeLabel = "Close",
  closeIconOnly = false,
  closeOnOverlayClick = false,
  description,
  initialFocusRef,
  onClose,
  open,
  title,
  triggerRef,
  ...props
}: DialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollPositionRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      const existingModal =
        document.querySelector<HTMLDialogElement>("dialog[open]");
      if (existingModal && existingModal !== dialog) {
        onClose();
        return;
      }

      scrollPositionRef.current = window.scrollY;
      dialog.showModal();
      window.requestAnimationFrame(() => {
        (initialFocusRef?.current ?? dialog).focus();
      });
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [initialFocusRef, onClose, open]);

  function handleClose(): void {
    window.scrollTo({ top: scrollPositionRef.current, behavior: "auto" });
    const trigger = triggerRef?.current;
    if (trigger && document.contains(trigger)) {
      trigger.focus();
    }
    onClose();
  }

  function handleCancel(event: React.SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    dialogRef.current?.close();
  }

  function handleOverlayClick(
    event: React.MouseEvent<HTMLDialogElement>,
  ): void {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      {...props}
      ref={dialogRef}
      className={cn(
        "w-[min(var(--letterly-dialog-max-width),calc(100%-var(--letterly-space-6)))] max-w-[var(--letterly-dialog-max-width)] max-h-[calc(100svh-var(--letterly-space-6))] rounded-large border border-border bg-surface p-0 text-ink shadow-medium [overflow-wrap:anywhere] backdrop:bg-backdrop [@media(max-width:48rem)]:w-full [@media(max-width:48rem)]:max-w-none [@media(max-width:48rem)]:max-h-svh [@media(max-width:48rem)]:rounded-none [@media(max-width:48rem)]:border-0",
        className,
      )}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={handleCancel}
      onClick={handleOverlayClick}
      onClose={handleClose}
    >
      <div
        className={cn(
          "grid gap-5 p-6 [@media(max-width:48rem)]:min-h-svh [@media(max-width:48rem)]:p-5",
          classNames?.content,
        )}
      >
        <header
          className={cn(
            "flex items-start justify-between gap-5",
            classNames?.header,
          )}
        >
          <div>
            <h2
              className={cn(
                "m-0 font-display text-[length:var(--letterly-text-heading-2)] leading-[var(--letterly-text-heading-2-line-height)] text-ink",
                classNames?.title,
              )}
              id={titleId}
            >
              {title}
            </h2>
            {description ? (
              <p
                className={cn(
                  "m-0 text-ink-muted leading-[var(--letterly-text-body-line-height)]",
                  classNames?.description,
                )}
                id={descriptionId}
              >
                {description}
              </p>
            ) : null}
          </div>
          {closeIconOnly ? (
            <IconButton
              className="shrink-0 p-0 font-body text-wine font-normal leading-none hover:border-wine hover:bg-wine hover:text-surface focus-visible:border-wine focus-visible:bg-wine focus-visible:text-surface active:border-wine-hover active:bg-wine-hover active:text-surface"
              data-dialog-close="icon-only"
              data-slot="button"
              data-size="default"
              data-variant="secondary"
              icon={
                <span className="text-[length:var(--letterly-dialog-close-icon-size)] leading-none">
                  ×
                </span>
              }
              label={closeLabel}
              onClick={() => dialogRef.current?.close()}
            />
          ) : (
            <Button
              className="shrink-0"
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              {closeLabel}
            </Button>
          )}
        </header>
        {children}
      </div>
    </dialog>
  );
}
