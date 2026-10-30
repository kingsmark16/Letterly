import { pageJourneyPublicPageProjectionSchema } from '@letterly/contracts/page-journeys';
import {
  publicProjectionBase,
  type PublicProjectionAdapter,
} from './public-projection';

export const chooseYourHeartPublicProjection: PublicProjectionAdapter = {
  registryKey: 'confession.choose-your-heart',
  version: 1,
  project(context) {
    const { page } = context;
    if (!('publishedGraphVersion' in page) || 'recipientName' in page) {
      throw new Error('Invalid Choose Your Heart public projection');
    }
    return pageJourneyPublicPageProjectionSchema.parse({
      ...publicProjectionBase(context),
      ...(page.letter ? { letter: page.letter } : {}),
      publishedGraphVersion: page.publishedGraphVersion,
      rootQuestionKey: page.rootQuestionKey,
      maxDepth: page.maxDepth,
      questions: page.questions,
      outcomes: page.outcomes,
    });
  },
};
