import { SecretLetterContent, SecretLetterSettings } from '@letterly/templates';

export type PageStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export interface TemplateSummary {
  id: string;
  key: string;
  name: string;
  templateVersionId: string;
  version: number;
  registryKey: string;
}

export interface OwnerPage {
  id: string;
  creatorId: string;
  slug: string;
  displaySlug: string;
  status: PageStatus;
  contentVersion: number;
  content: SecretLetterContent;
  settings: SecretLetterSettings;
  template: TemplateSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftSummary {
  id: string;
  recipientLabel: string;
  status: 'DRAFT';
  contentVersion: number;
  template: TemplateSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageCursor {
  updatedAt: Date;
  id: string;
}
