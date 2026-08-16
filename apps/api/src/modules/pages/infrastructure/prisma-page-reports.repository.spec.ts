jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPageReportsRepository } from './prisma-page-reports.repository';

describe('PrismaPageReportsRepository', () => {
  it('stores only the report reason and optional message for a current published page', async () => {
    const prisma = {
      page: {
        findFirst: jest.fn().mockResolvedValue({ id: 'page-id' }),
      },
      pageReport: {
        create: jest.fn().mockResolvedValue({ id: 'report-id' }),
      },
    };
    const repository = new PrismaPageReportsRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(
      repository.createPublicReport({
        slug: 'letter42',
        reason: 'HARASSMENT',
        message: '  unsafe content  ',
      }),
    ).resolves.toEqual({ type: 'created', reportId: 'report-id' });
    expect(prisma.pageReport.create).toHaveBeenCalledWith({
      data: {
        pageId: 'page-id',
        reason: 'HARASSMENT',
        message: 'unsafe content',
      },
      select: { id: true },
    });
  });
});
