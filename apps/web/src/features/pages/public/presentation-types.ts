import type {
  PageAudioLink,
  PublicSecretLetterProjection,
} from "@letterly/contracts/pages";
import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";
import type { SecretLetterRenderModel } from "@letterly/templates";

export interface SecretLetterPresentationPayload {
  slug: string;
  skipOpening: boolean;
  model: SecretLetterRenderModel;
  audioUrl?: string;
  audioTitle?: string;
  audioDurationMilliseconds?: number | null;
  audioLink?: PageAudioLink;
  response?: NonNullable<
    Extract<PublicSecretLetterProjection, { response?: unknown }>["response"]
  >;
}

export interface ChooseYourHeartPresentationPayload {
  page: PageJourneyPublicPageProjection;
  slug: string;
}

export type PublicTemplatePresentationProps =
  | {
      registryKey: "confession.secret-letter";
      version: 1;
      payload: SecretLetterPresentationPayload;
    }
  | {
      registryKey: "confession.choose-your-heart";
      version: 1;
      payload: ChooseYourHeartPresentationPayload;
    };
