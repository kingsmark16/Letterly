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
import styles from "./ui.module.css";

export interface DialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "onClose" | "title"
> {
  children: ReactNode;
  closeLabel?: string;
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
  closeLabel = "Close",
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
      const existingModal = document.querySelector<HTMLDialogElement>(
        "dialog[open]",
      );
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
      className={[styles.dialog, className].filter(Boolean).join(" ")}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={handleCancel}
      onClick={handleOverlayClick}
      onClose={handleClose}
    >
      <div className={styles.dialogShell}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 className={styles.dialogTitle} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={styles.dialogDescription} id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <Button
            className={styles.dialogClose}
            type="button"
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
          >
            {closeLabel}
          </Button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
