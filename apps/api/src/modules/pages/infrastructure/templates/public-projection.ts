import type { resolveTemplate } from '@letterly/templates';
import type { PublicPage, PublicPageBase } from '../../domain/page.types';

export interface PublicPageRecord {
  id: string;
  slug: string;
  displaySlug: string;
  content: unknown;
  settings: unknown;
  templateVersion: {
    registryKey: string;
    version: number;
    template: { key: string };
  };
  images?: Array<{
    id: string;
    caption: string | null;
  }>;
  currentAudio?: {
    state: 'UPLOADING' | 'VERIFYING' | 'READY' | 'FAILED' | 'EXPIRED';
    displayTitle: string;
    durationMilliseconds: number | null;
  } | null;
  currentAudioLink?: {
    id: string;
    pageId: string;
    provider: 'YOUTUBE';
    videoId: string;
  } | null;
  questions?: Array<{
    id: string;
    type: 'CHOICE' | 'PLAIN_MESSAGE';
    prompt: string;
    displayOrder: number;
    choices: Array<{
      id: string;
      label: string;
      displayOrder: number;
    }>;
  }>;
  pageJourney?: {
    publishedRevision: {
      revisionNumber: number;
      maxDepth: number;
      rootQuestion: { key: string };
      questions: Array<{
        key: string;
        prompt: string;
        displayOrder: number;
        choices: Array<{
          key: string;
          label: string;
          displayOrder: number;
          nextQuestion: { key: string } | null;
          outcome: { key: string } | null;
        }>;
      }>;
      outcomes: Array<{
        key: string;
        title: string;
        resultMessage: string;
        displayOrder: number;
      }>;
    } | null;
  } | null;
}

export interface PublicProjectionContext {
  page: PublicPageRecord;
  template: NonNullable<ReturnType<typeof resolveTemplate>>;
  media: Pick<PublicPageBase, 'images' | 'audio' | 'audioLink'>;
}

export interface TemplatePublicProjectionAdapter {
  registryKey: string;
  version: number;
  project: (context: PublicProjectionContext) => PublicPage;
}
