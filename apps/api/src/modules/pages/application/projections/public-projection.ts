import type { PageJourneyPublicPageProjection } from '@letterly/contracts/page-journeys';
import type { PublicSecretLetterProjection } from '@letterly/contracts/pages';
import type { PublicPage } from '../../domain/page.types';

export interface PublicProjectionContext {
  page: PublicPage;
  canonicalUrl: string;
  template: { registryKey: string; key: string; version: number };
}

export interface PublicProjectionAdapter {
  registryKey: string;
  version: number;
  project(
    context: PublicProjectionContext,
  ): PublicSecretLetterProjection | PageJourneyPublicPageProjection;
}

export function publicProjectionBase(context: PublicProjectionContext) {
  const { page, canonicalUrl, template } = context;
  return {
    displaySlug: page.displaySlug,
    canonicalUrl,
    template,
    images: page.images ?? [],
    ...(page.audio ? { audio: page.audio } : {}),
    ...(page.audioLink ? { audioLink: page.audioLink } : {}),
    ...(page.response?.enabled ? { response: page.response } : {}),
  };
}
