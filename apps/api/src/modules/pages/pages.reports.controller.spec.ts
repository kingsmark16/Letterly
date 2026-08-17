jest.mock('../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));

import type { PageService } from './application/page.service';
import { PageReportsService } from './application/page-reports.service';
import { PublicPagesController } from './pages.controller';
import type { RateLimitService } from '../../infrastructure/http/rate-limit.service';

describe('Public report controller', () => {
  it('rate limits and stores an anonymous report without raw identity data', async () => {
    const reportId = '11111111-1111-4111-8111-111111111111';
    const pageService = {} as PageService;
    const findPublicPageScope = jest.fn().mockResolvedValue('page-id');
    const create = jest.fn().mockResolvedValue({ accepted: true, reportId });
    const reports = {
      findPublicPageScope,
      create,
    } as unknown as PageReportsService;
    const consumePublicReport = jest.fn();
    const rateLimit = { consumePublicReport } as unknown as RateLimitService;
    const controller = new PublicPagesController(
      pageService,
      rateLimit,
      'visitor-secret',
      undefined,
      undefined,
      undefined,
      reports,
    );

    await expect(
      controller.report(
        { slug: 'Letter42' },
        {
          ip: '203.0.113.24',
          headers: { cookie: 'letterly_browser=browser-token' },
        } as never,
        { reason: 'SPAM', message: 'Unwanted content' },
      ),
    ).resolves.toEqual({ accepted: true, reportId });
    const rateLimitCalls = consumePublicReport.mock.calls as unknown[][];
    const rateLimitCall = rateLimitCalls[0];
    expect(rateLimitCall?.[0]).toBe('page-id');
    expect(rateLimitCall?.[1]).not.toBe('203.0.113.24');
    expect(create).toHaveBeenCalledWith({
      slug: 'Letter42',
      reason: 'SPAM',
      message: 'Unwanted content',
    });
  });
});
