import type { PublicSecretLetterProjection } from "@letterly/contracts/pages";
import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";

export interface PublicTemplateContext {
  page: PublicSecretLetterProjection | PageJourneyPublicPageProjection;
  slug: string;
  skipOpening: boolean;
}
