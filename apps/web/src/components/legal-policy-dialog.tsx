"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Dialog } from "@repo/ui/dialog";
import styles from "./legal-policy-dialog.module.css";

type PolicyKind = "privacy" | "terms";

type LegalPolicyDialogProps = {
  privacyContent: ReactNode;
  termsContent: ReactNode;
};

export function LegalPolicyDialog({
  privacyContent,
  termsContent,
}: LegalPolicyDialogProps): React.JSX.Element {
  const [activePolicy, setActivePolicy] = useState<PolicyKind | null>(null);
  const privacyTriggerRef = useRef<HTMLAnchorElement>(null);
  const termsTriggerRef = useRef<HTMLAnchorElement>(null);
  const closeDialog = useCallback(() => setActivePolicy(null), []);

  const activeTitle =
    activePolicy === "privacy" ? "Privacy Policy" : "Terms and Conditions";
  const activeDescription =
    activePolicy === "privacy"
      ? "How Letterly handles information across private pages and visitor responses."
      : "The agreement for creating, sharing, opening, and responding to a Letterly page.";
  const activeContent =
    activePolicy === "privacy" ? privacyContent : termsContent;
  const triggerRef =
    activePolicy === "privacy" ? privacyTriggerRef : termsTriggerRef;

  function openPolicy(policy: PolicyKind): void {
    setActivePolicy(policy);
  }

  function handleTriggerKeyDown(
    event: KeyboardEvent<HTMLAnchorElement>,
    policy: PolicyKind,
  ): void {
    if (event.key === " ") {
      event.preventDefault();
      openPolicy(policy);
    }
  }

  return (
    <>
      <a
        ref={privacyTriggerRef}
        className={styles.trigger}
        href="/privacy"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          openPolicy("privacy");
        }}
        onKeyDown={(event) => handleTriggerKeyDown(event, "privacy")}
      >
        Privacy
      </a>
      <a
        ref={termsTriggerRef}
        className={styles.trigger}
        href="/terms"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          openPolicy("terms");
        }}
        onKeyDown={(event) => handleTriggerKeyDown(event, "terms")}
      >
        Terms
      </a>

      <Dialog
        className={styles.dialog}
        closeLabel={`Close ${activeTitle}`}
        closeIconOnly
        closeOnOverlayClick
        description={activeDescription}
        onClose={closeDialog}
        open={activePolicy !== null}
        title={activeTitle}
        triggerRef={triggerRef}
      >
        <div className={styles.dialogBody}>
          <div className={styles.dialogBodyIntro}>
            <span>Letterly legal</span>
          </div>
          {activeContent}
        </div>
      </Dialog>
    </>
  );
}
