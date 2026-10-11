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
export interface DraftContentUpdate extends DraftContentOverrides {
  recipientName: string;
  mainMessage: string;
}
export interface TemplateDraftPolicy {
  registryKey: string;
  version: number;
  initialize: (input: DraftContentOverrides) => TemplateDraftInitialization;
  update: (current: unknown, input: DraftContentUpdate) => SecretLetterContent;
}
