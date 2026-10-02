import { chooseYourHeartTemplate } from '@letterly/templates';
import type { TemplatePublicationAdapter } from './publication-adapter';

export const chooseYourHeartPublicationAdapter: TemplatePublicationAdapter = {
  registryKey: chooseYourHeartTemplate.registryKey,
  version: chooseYourHeartTemplate.version,
  async prepare(transaction, pageId) {
    // The repository must acquire the owner Page lock before this journey lock.
    await transaction.$queryRaw`
      SELECT "id" FROM "PageJourney"
      WHERE "pageId" = ${pageId}
      FOR UPDATE
    `;
    const journey = await transaction.pageJourney.findUnique({
      where: { pageId },
      select: { id: true, draftRevisionId: true },
    });
    if (!journey) return null;
    return {
      incrementsContentVersion: true,
      async commit() {
        await transaction.pageJourney.update({
          where: { id: journey.id },
          data: { publishedRevisionId: journey.draftRevisionId },
        });
      },
    };
  },
};
