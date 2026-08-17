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
  images?: OwnerPageImage[];
  createdAt: Date;
  updatedAt: Date;
}

export type PageImageState =
  'UPLOADING' | 'VERIFYING' | 'SANITIZING' | 'READY' | 'FAILED' | 'EXPIRED';

export interface OwnerPageImage {
  imageId: string;
  state: PageImageState;
  attached: boolean;
  sortOrder: number | null;
  mediaUrl: string | null;
  caption: string | null;
  failureCode: string | null;
  expiresAt: Date | null;
}

export interface PublicPageImage {
  imageId: string;
  mediaUrl: string;
  caption: string | null;
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

export interface PublicPage {
  displaySlug: string;
  canonicalSlug: string;
  template: {
    key: 'secret-letter';
    version: number;
  };
  recipientName: string;
  mainMessage: string;
  images?: PublicPageImage[];
  response?:
    | { enabled: false }
    | {
        enabled: true;
        requiredAnswers: boolean;
        visitorMessageEnabled: boolean;
        visitorMessagePrompt: string;
        visitorMessagePrivacyText: string;
        visitorMessageMaxLength: number;
        textAnswerMaxLength: number;
        rootQuestionIds: string[];
        questions: Array<{
          id: string;
          type: 'CHOICE' | 'PLAIN_MESSAGE';
          prompt: string;
          displayOrder: number;
          nextQuestionId: string | null;
          choices: Array<{
            id: string;
            label: string;
            displayOrder: number;
            nextQuestionId: string | null;
          }>;
        }>;
      };
}
