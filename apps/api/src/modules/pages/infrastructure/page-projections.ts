import { resolveCatalogTemplate } from '@letterly/templates/catalog-resolution';
import {
  secretLetterPrivateSettingsSchema,
  resolveTemplate,
} from '@letterly/templates';
import type {
  OwnerPage,
  PageImageState,
  PublicPage,
} from '../domain/page.types';
import { TemplateDefinitionUnavailableError } from '../application/template-definition-unavailable.error';
import { resolveOwnerProjectionAdapter } from './templates/owner-projection-adapters';
import { resolvePublicProjectionAdapter } from './templates/public-projection-adapters';
import type { PublicPageRecord } from './templates/public-projection';

export function ownerProjection(templateVersion: {
  registryKey: string;
  version: number;
  template: { key: string };
}) {
  const catalog = resolveCatalogTemplate({
    registryKey: templateVersion.registryKey,
    rendererKey: templateVersion.template.key,
    version: templateVersion.version,
  });
  const template = catalog?.definition;
  const adapter = template && resolveOwnerProjectionAdapter(template);
  if (!catalog || !template || !adapter)
    throw new TemplateDefinitionUnavailableError();
  return { template, adapter, catalog };
}

export function mapOwnerPage(page: {
  id: string;
  creatorId: string;
  slug: string;
  displaySlug: string;
  status: OwnerPage['status'];
  contentVersion: number;
  content: unknown;
  settings?: unknown;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  unpublishedAt?: Date | null;
  templateVersion: {
    id: string;
    version: number;
    registryKey: string;
    template: {
      id: string;
      key: string;
    };
  };
  images?: Array<{
    id: string;
    state: PageImageState;
    attachedAt: Date | null;
    sortOrder: number | null;
    caption: string | null;
    failureCode: string | null;
    expiresAt: Date | null;
  }>;
  currentAudio?: {
    id: string;
    state: 'UPLOADING' | 'VERIFYING' | 'READY' | 'FAILED' | 'EXPIRED';
    displayTitle: string;
    sourceMimeType: string;
    sourceByteSize: number;
    durationMilliseconds: number | null;
    failureCode: string | null;
    createdAt: Date;
  } | null;
  currentAudioLink?: {
    id: string;
    pageId: string;
    provider: 'YOUTUBE';
    videoId: string;
  } | null;
  audioUploads?: Array<{
    id: string;
    state: 'UPLOADING' | 'VERIFYING' | 'READY' | 'FAILED' | 'EXPIRED';
    displayTitle: string;
    sourceMimeType: string;
    sourceByteSize: number;
    durationMilliseconds: number | null;
    failureCode: string | null;
    createdAt: Date;
  }>;
}): OwnerPage {
  const now = Date.now();
  const latestRetry = page.audioUploads?.[0];
  const retryFollowsCurrentAudio =
    latestRetry !== undefined &&
    (page.currentAudio === null ||
      page.currentAudio === undefined ||
      latestRetry.createdAt > page.currentAudio.createdAt);
  const { template, adapter, catalog } = ownerProjection(page.templateVersion);
  const audioCapability = template.audioCapability;
  const privateSettings = secretLetterPrivateSettingsSchema.parse(
    page.settings,
  );
  const projection = adapter.project({
    content: page.content,
    privateSettings,
  });

  return {
    id: page.id,
    creatorId: page.creatorId,
    slug: page.slug,
    displaySlug: page.displaySlug,
    status: page.status,
    contentVersion: page.contentVersion,
    passwordProtected: privateSettings.passwordProtection !== null,
    ...projection,
    template: {
      id: page.templateVersion.template.id,
      key: page.templateVersion.template.key,
      name: catalog.name,
      templateVersionId: page.templateVersion.id,
      version: page.templateVersion.version,
      registryKey: page.templateVersion.registryKey,
    },
    images: (page.images ?? [])
      .filter(
        (image) => image.expiresAt === null || image.expiresAt.getTime() > now,
      )
      .map((image) => ({
        imageId: image.id,
        state: image.state,
        attached: image.attachedAt !== null,
        sortOrder: image.sortOrder,
        mediaUrl:
          image.state === 'READY'
            ? `/api/v1/pages/${page.id}/images/${image.id}`
            : null,
        caption: image.caption,
        failureCode: image.failureCode,
        expiresAt: image.expiresAt,
      })),
    ...(audioCapability !== 'hidden' && page.currentAudio
      ? {
          audio: {
            audioId: page.currentAudio.id,
            state: page.currentAudio.state,
            title: page.currentAudio.displayTitle,
            sourceMimeType: page.currentAudio.sourceMimeType,
            sourceByteSize: page.currentAudio.sourceByteSize,
            durationMilliseconds: page.currentAudio.durationMilliseconds,
            failureCode: page.currentAudio.failureCode,
          },
        }
      : {}),
    ...(audioCapability !== 'hidden' &&
    page.currentAudioLink?.pageId === page.id
      ? {
          audioLink: {
            id: page.currentAudioLink.id,
            provider: page.currentAudioLink.provider,
            videoId: page.currentAudioLink.videoId,
            displayTitle: 'YouTube song',
            durationSeconds: null,
            metadataExpiresAt: null,
          },
        }
      : {}),
    ...(audioCapability !== 'hidden' && retryFollowsCurrentAudio
      ? {
          audioRetry: {
            audioId: latestRetry.id,
            state: latestRetry.state,
            title: latestRetry.displayTitle,
            sourceMimeType: latestRetry.sourceMimeType,
            sourceByteSize: latestRetry.sourceByteSize,
            durationMilliseconds: latestRetry.durationMilliseconds,
            failureCode: latestRetry.failureCode,
          },
        }
      : {}),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export function mapPublicPage(page: PublicPageRecord): PublicPage {
  const trustedTemplate = resolveTemplate({
    registryKey: page.templateVersion.registryKey,
    rendererKey: page.templateVersion.template.key,
    version: page.templateVersion.version,
  });
  if (!trustedTemplate) {
    throw new Error('Public template registry definition is unavailable');
  }

  const adapter = resolvePublicProjectionAdapter(trustedTemplate);
  if (!adapter)
    throw new Error('Public template projection adapter is unavailable');

  const audio =
    trustedTemplate.audioCapability !== 'hidden' &&
    page.currentAudio?.state === 'READY'
      ? {
          mediaUrl: `/p/${encodeURIComponent(page.displaySlug)}/audio`,
          title: page.currentAudio.displayTitle,
          durationMilliseconds: page.currentAudio.durationMilliseconds,
        }
      : undefined;
  const audioLink =
    trustedTemplate.audioCapability !== 'hidden' &&
    page.currentAudioLink?.pageId === page.id
      ? {
          id: page.currentAudioLink.id,
          provider: page.currentAudioLink.provider,
          videoId: page.currentAudioLink.videoId,
          displayTitle: 'YouTube song',
          durationSeconds: null,
          metadataExpiresAt: null,
        }
      : undefined;
  const media = {
    images: (page.images ?? []).map((image) => ({
      imageId: image.id,
      mediaUrl: `/p/${encodeURIComponent(page.displaySlug)}/media/${image.id}`,
      caption: image.caption,
    })),
    ...(audio ? { audio } : {}),
    ...(audioLink ? { audioLink } : {}),
  };
  return adapter.project({ page, template: trustedTemplate, media });
}
