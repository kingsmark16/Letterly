import { SecretLetterContent, SecretLetterSettings } from '@letterly/templates';

export type PageStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export type ListPagesStatus = PageStatus | 'ALL';

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

export interface PageSummary {
  id: string;
  recipientLabel: string;
  status: PageStatus;
  contentVersion: number;
  template: TemplateSummary;
  createdAt: Date;
  updatedAt: Date;
}

export type DraftSummary = PageSummary;

export interface PageCursor {
  updatedAt: Date;
  id: string;
}

export interface PublicPageBase {
  displaySlug: string;
  canonicalSlug: string;
  template: {
    key: string;
    version: number;
  };
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
        rootQuestionIds?: string[];
        questions?: Array<{
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

export interface PublicSecretLetterPage extends PublicPageBase {
  template: {
    key: 'secret-letter';
    version: number;
  };
  recipientName: string;
  mainMessage: string;
}

export interface PublicChooseYourHeartPage extends PublicPageBase {
  template: {
    key: 'choose-your-heart';
    version: number;
  };
  publishedGraphVersion: number;
  rootQuestionKey: string;
  maxDepth: number;
  questions: Array<{
    key: string;
    prompt: string;
    displayOrder: number;
    choices: Array<{
      key: string;
      label: string;
      displayOrder: number;
      nextQuestionKey: string | null;
      outcomeKey: string | null;
    }>;
  }>;
  outcomes: Array<{
    key: string;
    title: string;
    resultMessage: string;
    displayOrder: number;
  }>;
}

export type PublicPage = PublicSecretLetterPage | PublicChooseYourHeartPage;
