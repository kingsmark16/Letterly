import type { PrismaClient } from '@letterly/database';
import { backfillJourneyAnswerCounts } from './backfill-journey-answer-counts';

describe('backfillJourneyAnswerCounts', () => {
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const transaction = { visitorSubmission: { findMany, updateMany } };
  const $transaction = jest.fn(
    async (run: (client: typeof transaction) => Promise<unknown>) =>
      run(transaction),
  );
  const prisma = { $transaction } as unknown as PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('validates snapshots and guards every write against deletion and concurrent count updates', async () => {
    findMany.mockResolvedValue([
      {
        id: 'valid',
        journeySnapshot: {
          revisionNumber: 1,
          answers: [
            {
              questionKey: 'root',
              prompt: 'Prompt',
              choiceKey: 'yes',
              choiceLabel: 'Yes',
            },
          ],
          outcomeKey: 'result',
          outcomeTitle: 'Result',
          outcomeMessage: 'Message',
        },
      },
      {
        id: 'malformed',
        journeySnapshot: { answers: [{ questionKey: 'root' }] },
      },
      { id: 'letter', journeySnapshot: null },
    ]);
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(backfillJourneyAnswerCounts(prisma)).resolves.toEqual({
      selected: 3,
      updated: 2,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { journeyAnswerCount: null, deletedAt: null },
      orderBy: { id: 'asc' },
      take: 100,
      select: { id: true, journeySnapshot: true },
    });
    for (const [index, id] of ['valid', 'malformed', 'letter'].entries()) {
      expect(updateMany).toHaveBeenNthCalledWith(index + 1, {
        where: { id, journeyAnswerCount: null, deletedAt: null },
        data: { journeyAnswerCount: index === 0 ? 1 : 0 },
      });
    }
    expect($transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 30_000,
    });
  });

  it('does no writes when the selected batch is empty', async () => {
    findMany.mockResolvedValue([]);
    await expect(backfillJourneyAnswerCounts(prisma)).resolves.toEqual({
      selected: 0,
      updated: 0,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('propagates a database failure to the transaction owner', async () => {
    findMany.mockResolvedValue([{ id: 'letter', journeySnapshot: null }]);
    const error = new Error('database failure');
    updateMany.mockRejectedValueOnce(error);
    await expect(backfillJourneyAnswerCounts(prisma)).rejects.toBe(error);
  });
});
