"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingState } from "../../../components/loading-state";
import {
  ChooseYourHeartRenderer,
  type JourneySubmissionStatus,
} from "../../../templates/choose-your-heart/renderer";
import {
  editorJourneyPreviewChannel,
  isEditorJourneyPreviewUpdateMessage,
  type EditorJourneyPreviewPayload,
} from "./editor-journey-preview-protocol";

const readyMessage = {
  channel: editorJourneyPreviewChannel,
  type: "ready",
} as const;

/**
 * Renders inside an iframe so the template's responsive breakpoints follow the
 * previewed device width instead of the creator's browser window.
 */
export function EditorJourneyPreviewFrameContent(): React.JSX.Element {
  const [payload, setPayload] = useState<EditorJourneyPreviewPayload | null>(
    null,
  );
  const [submissionStatus, setSubmissionStatus] =
    useState<JourneySubmissionStatus>("idle");
  const receivedPayloadRef = useRef(false);

  useEffect(() => {
    function notifyParent(): void {
      window.parent.postMessage(readyMessage, window.location.origin);
    }

    function handleParentMessage(event: MessageEvent<unknown>): void {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !isEditorJourneyPreviewUpdateMessage(event.data)
      ) {
        return;
      }

      receivedPayloadRef.current = true;
      setPayload(event.data.payload);
    }

    window.addEventListener("message", handleParentMessage);
    notifyParent();
    const retryId = window.setInterval(() => {
      if (!receivedPayloadRef.current) notifyParent();
    }, 300);

    return () => {
      window.clearInterval(retryId);
      window.removeEventListener("message", handleParentMessage);
    };
  }, []);

  if (!payload) {
    return (
      <LoadingState
        title="Loading letter preview"
        description="Getting your letter ready to open."
      />
    );
  }

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-[#140410]">
      <ChooseYourHeartRenderer
        contained
        page={payload.page}
        submissionStatus={submissionStatus}
        submissionError={null}
        onSubmit={() => setSubmissionStatus("accepted")}
        onResetResponse={() => setSubmissionStatus("idle")}
        onOutcomeChanged={() => {}}
      />
    </div>
  );
}
