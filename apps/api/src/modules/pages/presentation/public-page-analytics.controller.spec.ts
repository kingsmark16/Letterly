import { PageService } from '../application/page.service';
import { PublicPageAnalyticsController } from './public-page-analytics.controller';
const pageService = { getPublicPage: jest.fn() };
describe('Public journey metric controller', () => {
  beforeEach(() => {
    pageService.getPublicPage.mockReset();
  });
  it('records public journey metrics only for a published Choose Your Heart page', async () => {
    const metrics = { record: jest.fn() };
    const publicController = new PublicPageAnalyticsController(
      pageService as unknown as PageService,
      undefined,
      undefined,
      undefined,
      metrics,
    );
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'journey-page',
      canonicalUrl: 'http://localhost:3000/p/journey-page',
      template: { key: 'choose-your-heart', version: 1 },
      publishedGraphVersion: 1,
      rootQuestionKey: 'root',
      maxDepth: 1,
      questions: [],
      outcomes: [],
      images: [],
    });

    await publicController.recordJourneyMetric(
      { slug: 'journey-page' },
      { ip: '127.0.0.1', headers: {} } as never,
      { event: 'journey_start', templateKey: 'choose-your-heart' },
    );

    expect(metrics.record).toHaveBeenCalledWith({
      event: 'journey_start',
      templateKey: 'choose-your-heart',
    });
  });
  it('rejects journey metrics for a different published template', async () => {
    const metrics = { record: jest.fn() };
    const publicController = new PublicPageAnalyticsController(
      pageService as unknown as PageService,
      undefined,
      undefined,
      undefined,
      metrics,
    );
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'secret-page',
      canonicalUrl: 'http://localhost:3000/p/secret-page',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    const promise = publicController.recordJourneyMetric(
      { slug: 'secret-page' },
      { ip: '127.0.0.1', headers: {} } as never,
      { event: 'journey_start', templateKey: 'choose-your-heart' },
    );

    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'UNSUPPORTED_CAPABILITY',
        statusCode: 422,
      }) as jest.AsymmetricMatcher,
    });
    expect(metrics.record).not.toHaveBeenCalled();
  });
});
