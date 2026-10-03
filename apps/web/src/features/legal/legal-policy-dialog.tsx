"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Dialog, type DialogProps } from "@repo/ui/dialog";
import { supportsNativeDialog } from "../../lib/native-dialog";
import styles from "./legal-policy-dialog.module.css";

type PolicyKind = "privacy" | "terms";

type LegalPolicyDialogProps = {
  privacyContent: ReactNode;
  termsContent: ReactNode;
};

const dialogClassNames = {
  content:
    "h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0 p-0 [@media(max-width:48rem)]:min-h-0 [@media(max-width:48rem)]:p-0",
  header:
    "relative z-1 border-b border-border bg-surface px-6 py-5 text-start [@media(30rem<width<=48rem)]:gap-3 [@media(30rem<width<=48rem)]:px-4 [@media(30rem<width<=48rem)]:pt-[calc(var(--letterly-space-4)+env(safe-area-inset-top,0px))] [@media(30rem<width<=48rem)]:pb-3 [@media(max-width:30rem)]:gap-2 [@media(max-width:30rem)]:px-3 [@media(max-width:30rem)]:pt-[calc(var(--letterly-space-3)+env(safe-area-inset-top,0px))] [@media(max-width:30rem)]:pb-2",
  heading: "min-w-0",
  title:
    "text-start [@media(30rem<width<=48rem)]:text-[clamp(1.8rem,8vw,2.25rem)] [@media(30rem<width<=48rem)]:leading-[1.05] [@media(max-width:30rem)]:text-[clamp(1.35rem,6.8vw,1.65rem)] [@media(max-width:30rem)]:leading-[1.08]",
  description:
    "text-start font-normal tracking-normal normal-case [@media(30rem<width<=48rem)]:max-w-[34ch] [@media(30rem<width<=48rem)]:mt-1 [@media(30rem<width<=48rem)]:text-small [@media(30rem<width<=48rem)]:leading-[1.45] [@media(max-width:30rem)]:max-w-[36ch] [@media(max-width:30rem)]:mt-[0.2rem] [@media(max-width:30rem)]:text-[0.8rem] [@media(max-width:30rem)]:leading-[1.35]",
} satisfies NonNullable<DialogProps["classNames"]>;

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
    if (event.key === " " && supportsNativeDialog()) {
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
          if (!supportsNativeDialog()) return;
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
          if (!supportsNativeDialog()) return;
          event.preventDefault();
          openPolicy("terms");
        }}
        onKeyDown={(event) => handleTriggerKeyDown(event, "terms")}
      >
        Terms
      </a>

      <Dialog
        className="box-border fixed inset-0 m-auto w-[min(var(--letterly-dialog-document-max-width),calc(100%-var(--letterly-space-5)*2))] max-w-[var(--letterly-dialog-document-max-width)] h-[min(88svh,var(--letterly-dialog-document-max-height))] max-h-[calc(100svh-var(--letterly-space-5)*2)] overflow-hidden border-0 [@media(max-width:48rem)]:m-0 [@media(max-width:48rem)]:h-dvh [@media(max-width:48rem)]:max-h-dvh"
        classNames={dialogClassNames}
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
