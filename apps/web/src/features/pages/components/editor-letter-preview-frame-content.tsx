"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingState } from "../../../components/loading-state";
import { SecretLetterRenderer } from "../../../templates/secret-letter";
import {
  editorLetterPreviewChannel,
  isEditorLetterPreviewUpdateMessage,
  type EditorLetterPreviewPayload,
} from "./editor-letter-preview-protocol";
import { VisitorResponseForm } from "./visitor-response-form";

const readyMessage = {
  channel: editorLetterPreviewChannel,
  type: "ready",
} as const;

export function EditorLetterPreviewFrameContent(): React.JSX.Element {
  const [payload, setPayload] = useState<EditorLetterPreviewPayload | null>(
    null,
  );
  const receivedPayloadRef = useRef(false);

  useEffect(() => {
    function notifyParent(): void {
      window.parent.postMessage(readyMessage, window.location.origin);
    }

    function handleParentMessage(event: MessageEvent<unknown>): void {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !isEditorLetterPreviewUpdateMessage(event.data)
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
    <SecretLetterRenderer
      model={payload.model}
      showAudioPlayerWhenEmpty
      audioUrl={payload.audio?.mediaUrl}
      audioTitle={payload.audio?.title}
      audioDurationMilliseconds={payload.audio?.durationMilliseconds}
      audioLink={payload.audioLink ?? undefined}
      audioMetadataUrl={payload.audioMetadataUrl ?? undefined}
    >
      {payload.response ? (
        <VisitorResponseForm
          preview
          slug="editor-preview"
          response={payload.response}
        />
      ) : null}
    </SecretLetterRenderer>
  );
}
