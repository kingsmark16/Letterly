import type {
  SecretLetterContent,
  SecretLetterSettings,
  PageJourneyValidationResult,
} from '@letterly/templates';
export interface DraftContentOverrides {
  title?: string;
  recipientName?: string;
  mainMessage?: string;
  creatorName?: string;
}
export interface TemplateDraftInitialization {
  content: SecretLetterContent;
  settings: SecretLetterSettings;
  journeyValidation?: PageJourneyValidationResult;
}
export interface TemplateDraftPolicy {
  registryKey: string;
  version: number;
  initialize: (input: DraftContentOverrides) => TemplateDraftInitialization;
}
