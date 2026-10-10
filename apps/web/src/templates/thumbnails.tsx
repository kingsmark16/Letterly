import type { ComponentType } from "react";
import type { ChooseYourHeartQuestion } from "./choose-your-heart/first-section";
import { ChooseYourHeartThumbnail } from "./choose-your-heart/thumbnail";
import { SecretLetterThumbnail } from "./secret-letter/thumbnail";
import type { WebTemplateId } from "./registration";
export interface TemplateThumbnailInput {
  id: string;
  journeyQuestion?: ChooseYourHeartQuestion | null;
  letterTitle?: string;
}
export const templateThumbnails = {
  "confession.secret-letter": SecretLetterThumbnail,
  "confession.choose-your-heart": ChooseYourHeartThumbnail,
} satisfies Record<WebTemplateId, ComponentType<TemplateThumbnailInput>>;
