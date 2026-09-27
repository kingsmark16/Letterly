import type {
  EnabledPublicResponseDescription,
  PageAudioLink,
} from "@letterly/contracts/pages";
import type { SecretLetterRenderModel } from "@letterly/templates";

export const editorLetterPreviewChannel = "letterly:editor-letter-preview";

export interface EditorLetterPreviewPayload {
  model: SecretLetterRenderModel;
  response: EnabledPublicResponseDescription | null;
  audio: {
    mediaUrl: string;
    title: string;
    durationMilliseconds: number | null;
  } | null;
  audioLink: PageAudioLink | null;
  audioMetadataUrl: string | null;
}

interface EditorLetterPreviewReadyMessage {
  channel: typeof editorLetterPreviewChannel;
  type: "ready";
}

interface EditorLetterPreviewUpdateMessage {
  channel: typeof editorLetterPreviewChannel;
  type: "update";
  payload: EditorLetterPreviewPayload;
}

export function isEditorLetterPreviewReadyMessage(
  message: unknown,
): message is EditorLetterPreviewReadyMessage {
  if (typeof message !== "object" || message === null) return false;

  const candidate = message as Record<string, unknown>;
  return (
    candidate.channel === editorLetterPreviewChannel &&
    candidate.type === "ready"
  );
}

export function isEditorLetterPreviewUpdateMessage(
  message: unknown,
): message is EditorLetterPreviewUpdateMessage {
  if (typeof message !== "object" || message === null) return false;

  const candidate = message as Record<string, unknown>;
  return (
    candidate.channel === editorLetterPreviewChannel &&
    candidate.type === "update" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}
