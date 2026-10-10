import type { SecretLetterPrivateSettings } from '@letterly/templates';
import type { ListPagesResult } from '../../application/pages.repository';
import type { OwnerPage } from '../../domain/page.types';

export interface OwnerProjectionContext {
  content: unknown;
  privateSettings: SecretLetterPrivateSettings;
}

export interface OwnerSummaryContext {
  content: unknown;
  firstQuestion?: {
    prompt: string;
    choices: Array<{ key: string; label: string }>;
  };
}

export interface TemplateOwnerProjectionAdapter {
  registryKey: string;
  version: number;
  project: (
    context: OwnerProjectionContext,
  ) => Pick<OwnerPage, 'content' | 'settings'>;
  summarize: (
    context: OwnerSummaryContext,
  ) => Pick<ListPagesResult['items'][number], 'recipientLabel' | 'preview'>;
}
