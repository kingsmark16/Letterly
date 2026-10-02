import { createHmac } from 'node:crypto';
import { SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { PageService } from '../application/page.service';
import { PublicPageReadController } from './public-page-read.controller';

describe('Public page read controller', () => {
  let pageService: jest.Mocked<Pick<PageService, 'getPublicPage'>>;
  beforeEach(() => {
    pageService = { getPublicPage: jest.fn() };
  });
  it('declares the optional rate limit service for Nest runtime injection', () => {
    const dependencies: unknown = Reflect.getMetadata(
      SELF_DECLARED_DEPS_METADATA,
      PublicPageReadController,
    );
    expect(dependencies).toEqual(
      expect.arrayContaining([{ index: 1, param: RateLimitService }]),
    );
  });

  it('AC-6 returns the exact safe anonymous projection', async () => {
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    const publicController = new PublicPageReadController(
      pageService as unknown as PageService,
    );
    const response = await publicController.get(
      { slug: 'my-letter' },
      { ip: '127.0.0.1', headers: {} } as never,
      { setHeader: jest.fn() } as never,
    );

    expect(response).toEqual({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });
    expect(response).not.toHaveProperty('creatorId');
  });

  it('AC-14 rate limits a signed visitor identity instead of the API server IP', async () => {
    const secret = 'a-secure-test-secret-that-is-long-enough';
    const payload = createVisitorIdentityPayload(
      '203.0.113.24',
      Math.floor(Date.now() / 1000),
    );
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    const consumePublic = jest.fn();
    const rateLimitService = {
      consumePublic,
    } as unknown as RateLimitService;
    const publicController = new PublicPageReadController(
      pageService as unknown as PageService,
      rateLimitService,
      secret,
    );

    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    await publicController.get(
      {
        slug: 'my-letter',
      },
      {
        ip: '127.0.0.1',
        headers: {
          [visitorIdentityHeader]: `${payload}.${signature}`,
        },
      } as never,
      { setHeader: jest.fn() } as never,
    );

    expect(consumePublic).toHaveBeenCalledWith('203.0.113.24');
  });
});
