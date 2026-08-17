import {
  PageReportsService,
  PublicReportUnavailableError,
} from './page-reports.service';
import type { PageReportsRepository } from './page-reports.repository';
import { PublicReportPageNotFoundError } from './page-reports.service';

describe('PageReportsService', () => {
  it('normalizes the slug and creates an anonymous report receipt', async () => {
    const repository: jest.Mocked<PageReportsRepository> = {
      findPublishedPageScope: jest.fn().mockResolvedValue('page-id'),
      createPublicReport: jest
        .fn()
        .mockResolvedValue({ type: 'created', reportId: 'report-id' }),
    };
    const service = new PageReportsService(repository);

    await expect(
      service.create({
        slug: ' Letter42 ',
        reason: 'SPAM',
        message: '  unwanted content  ',
      }),
    ).resolves.toEqual({ accepted: true, reportId: 'report-id' });
    expect(repository.createPublicReport.mock.calls).toContainEqual([
      {
        slug: 'letter42',
        reason: 'SPAM',
        message: '  unwanted content  ',
      },
    ]);
  });

  it('uses a safe not found error for unavailable pages', async () => {
    const repository: jest.Mocked<PageReportsRepository> = {
      findPublishedPageScope: jest.fn().mockResolvedValue(null),
      createPublicReport: jest.fn(),
    };
    const service = new PageReportsService(repository);

    await expect(service.findPublicPageScope('missing')).rejects.toBeInstanceOf(
      PublicReportPageNotFoundError,
    );
    expect(repository.createPublicReport.mock.calls).toHaveLength(0);
  });

  it('maps persistence failures to a recoverable service error', async () => {
    const repository: jest.Mocked<PageReportsRepository> = {
      findPublishedPageScope: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
      createPublicReport: jest.fn(),
    };
    const service = new PageReportsService(repository);

    await expect(
      service.findPublicPageScope('letter42'),
    ).rejects.toBeInstanceOf(PublicReportUnavailableError);
  });
});
