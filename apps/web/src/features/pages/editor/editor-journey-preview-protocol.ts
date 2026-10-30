import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";

export const editorJourneyPreviewChannel = "letterly:editor-journey-preview";

export interface EditorJourneyPreviewPayload {
  page: PageJourneyPublicPageProjection;
}

interface EditorJourneyPreviewReadyMessage {
  channel: typeof editorJourneyPreviewChannel;
  type: "ready";
}

interface EditorJourneyPreviewUpdateMessage {
  channel: typeof editorJourneyPreviewChannel;
  type: "update";
  payload: EditorJourneyPreviewPayload;
}

export function isEditorJourneyPreviewReadyMessage(
  message: unknown,
): message is EditorJourneyPreviewReadyMessage {
  if (typeof message !== "object" || message === null) return false;

  const candidate = message as Record<string, unknown>;
  return (
    candidate.channel === editorJourneyPreviewChannel &&
    candidate.type === "ready"
  );
}

export function isEditorJourneyPreviewUpdateMessage(
  message: unknown,
): message is EditorJourneyPreviewUpdateMessage {
  if (typeof message !== "object" || message === null) return false;

  const candidate = message as Record<string, unknown>;
  const payload = candidate.payload as Record<string, unknown> | null;
  return (
    candidate.channel === editorJourneyPreviewChannel &&
    candidate.type === "update" &&
    typeof payload === "object" &&
    payload !== null &&
    typeof payload.page === "object" &&
    payload.page !== null
  );
}
