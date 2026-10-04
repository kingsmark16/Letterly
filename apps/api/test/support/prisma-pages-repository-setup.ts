import type { PrismaClient } from '@letterly/database';

import { PrismaPagesRepository } from '../../src/modules/pages/infrastructure/prisma-pages.repository';
import type { UpdateDraftCommand } from '../../src/modules/pages/application/page.service';
import { updateLetterContent } from '../../src/modules/pages/application/templates/letter-content';
jest.mock('node:crypto', () => ({
  randomInt: jest.fn(),
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../../src/infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

export const creatorId = 'creator-123';

export const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

export type PrismaMock = {
  page: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  pageImage: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
    delete: jest.Mock;
  };
  pageAudio: {
    findMany: jest.Mock;
  };
  visitorSubmission: {
    deleteMany: jest.Mock;
  };
  mediaCleanup: {
    createMany: jest.Mock;
  };
  pageSlugReservation: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  pageJourney: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  pageJourneyGraphRevision: {
    create: jest.Mock;
  };
  pageJourneyQuestion: {
    createMany: jest.Mock;
  };
  pageJourneyOutcome: {
    createMany: jest.Mock;
  };
  pageJourneyChoice: {
    createMany: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $disconnect: jest.Mock;
  $connect: jest.Mock;
  $transaction: jest.Mock;
};

export type TransactionCallback = (transaction: PrismaMock) => Promise<unknown>;

export function createPrismaMock(): PrismaMock {
  return {
    page: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pageImage: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    pageAudio: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    visitorSubmission: {
      deleteMany: jest.fn(),
    },
    mediaCleanup: {
      createMany: jest.fn(),
    },
    pageSlugReservation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pageJourney: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pageJourneyGraphRevision: {
      create: jest.fn(),
    },
    pageJourneyQuestion: {
      createMany: jest.fn(),
    },
    pageJourneyOutcome: {
      createMany: jest.fn(),
    },
    pageJourneyChoice: {
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $connect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
  };
}

export function createPageRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
    creatorId,
    slug: 'abcdefgh',
    displaySlug: 'abcdefgh',
    status: 'DRAFT' as const,
    contentVersion: 0,
    content: {
      recipientName: '',
      mainMessage: '',
      sections: [],
    },
    settings: {
      theme: 'romantic',
      fontStyle: 'handwritten',
      autoPlayMusic: false,
      music: null,
    },
    createdAt: new Date('2026-08-09T00:00:00.000Z'),
    updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    templateVersion: {
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.secret-letter',
      template: {
        id: '0cf6b27e-7d7d-40e8-bc18-ef1cdff1cb16',
        key: 'secret-letter',
        name: 'Secret Letter',
      },
    },
    ...overrides,
  };
}

export function createRepositoryTestContext() {
  const prisma = createPrismaMock();
  prisma.$transaction.mockImplementation(
    async (callback: TransactionCallback) => callback(prisma),
  );
  const repository = new PrismaPagesRepository(
    prisma as unknown as PrismaClient,
  );
  function updateDraft(command: UpdateDraftCommand) {
    return repository.updateDraft({
      creatorId: command.creatorId,
      pageId: command.pageId,
      expectedContentVersion: command.expectedContentVersion,
      ...(command.images !== undefined ? { images: command.images } : {}),
      updateContent: (current) => updateLetterContent(current, command),
    });
  }
  return { prisma, repository, updateDraft };
}

export type RepositoryTestContext = ReturnType<
  typeof createRepositoryTestContext
>;
