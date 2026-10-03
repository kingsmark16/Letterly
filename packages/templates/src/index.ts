import {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterRenderModelSchema,
  secretLetterTitleInputSchema,
  SECRET_LETTER_TITLE_MAX_GRAPHEMES,
  secretLetterEncryptedPasswordSchema,
  secretLetterPrivateSettingsSchema,
  secretLetterSettingsSchema,
  type SecretLetterContent,
  type SecretLetterEditableContent,
  type SecretLetterRenderModel,
  type SecretLetterEncryptedPassword,
  type SecretLetterPrivateSettings,
  type SecretLetterSettings,
} from "@letterly/templates/secret-letter";
import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartSettingsSchema,
  chooseYourHeartTemplate,
} from "@letterly/templates/choose-your-heart";

export {
  countGraphemes,
  hasAtMostGraphemes,
  truncateGraphemes,
} from "@letterly/templates/graphemes";
export {
  IMAGE_CAPTION_MAX_GRAPHEMES,
  imageCaptionSchema,
  imageCaptionProjectionSchema,
} from "@letterly/templates/media";
export {
  pageJourneyChoiceSchema,
  pageJourneyChoiceLabelSchema,
  pageJourneyGraphSchema,
  pageJourneyOutcomeSchema,
  pageJourneyOutcomeMessageSchema,
  pageJourneyOutcomeTitleSchema,
  pageJourneyQuestionSchema,
  pageJourneyQuestionPromptSchema,
  pageJourneySnapshotSchema,
  validatePageJourneyGraph,
} from "@letterly/templates/journey";

export type {
  PageJourneyChoice,
  PageJourneyGraph,
  PageJourneyOutcome,
  PageJourneyQuestion,
  PageJourneySnapshot,
  PageJourneyValidationIssue,
  PageJourneyValidationResult,
} from "@letterly/templates/journey";

export {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterTitleInputSchema,
  SECRET_LETTER_TITLE_MAX_GRAPHEMES,
  secretLetterSettingsSchema,
  secretLetterRenderModelSchema,
  secretLetterEncryptedPasswordSchema,
  secretLetterPrivateSettingsSchema,
  chooseYourHeartSettingsSchema,
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
};

export type {
  SecretLetterContent,
  SecretLetterEditableContent,
  SecretLetterSettings,
  SecretLetterRenderModel,
  SecretLetterEncryptedPassword,
  SecretLetterPrivateSettings,
};

export {
  templateCapabilitySchema,
  templateAudioCapabilitySchema,
} from "@letterly/templates/capabilities";
export type {
  TemplateCapability,
  TemplateAudioCapability,
} from "@letterly/templates/capabilities";
export { secretLetterTemplate } from "@letterly/templates/secret-letter";
export {
  templateRegistry,
  resolveTemplate,
  resolveTemplateFromDefinitions,
} from "@letterly/templates/registry";
export type { TemplateResolution } from "@letterly/templates/registry";
export { validateCatalogIdentities } from "@letterly/templates/catalog-validation";
export { createTemplateImplementationRegistry } from "@letterly/templates/implementation-registry";
export type { TemplateImplementationIdentity } from "@letterly/templates/implementation-registry";
export type {
  CatalogCategoryIdentity,
  CatalogTemplateIdentity,
} from "@letterly/templates/catalog-validation";
export {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
