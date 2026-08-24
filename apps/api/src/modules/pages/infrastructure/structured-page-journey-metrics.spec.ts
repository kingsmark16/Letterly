import { Logger } from '@nestjs/common';
import type { PageJourneyMetricEvent } from '@letterly/contracts/metrics';
import { journeyMetricOutcomeCategory } from '@letterly/contracts/metrics';
import { StructuredPageJourneyMetrics } from './structured-page-journey-metrics';

describe('StructuredPageJourneyMetrics', () => {
  it('logs only the bounded metric fields', () => {
    const loggerLog = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const metrics = new StructuredPageJourneyMetrics();

    const unsafeEvent = {
      event: 'journey_completed',
      templateKey: 'choose-your-heart',
      outcomeCategory: 'outcome_2',
      pageId: 'page-secret',
      answers: [{ questionKey: 'root', choiceKey: 'private-choice' }],
      visitorMessage: 'private message',
      token: 'browser-token',
    } as unknown as PageJourneyMetricEvent;

    metrics.record(unsafeEvent);

    expect(loggerLog).toHaveBeenCalledWith({
      event: 'journey_completed',
      templateKey: 'choose-your-heart',
      outcomeCategory: 'outcome_2',
    });
    expect(JSON.stringify(loggerLog.mock.calls)).not.toContain('page-secret');
    expect(JSON.stringify(loggerLog.mock.calls)).not.toContain(
      'private-choice',
    );
    expect(JSON.stringify(loggerLog.mock.calls)).not.toContain(
      'private message',
    );
    expect(JSON.stringify(loggerLog.mock.calls)).not.toContain('browser-token');

    loggerLog.mockRestore();
  });

  it('rejects unbounded outcome categories', () => {
    const metrics = new StructuredPageJourneyMetrics();

    expect(() =>
      metrics.record({
        event: 'journey_completed',
        templateKey: 'choose-your-heart',
        outcomeCategory: 'happy-result',
      } as unknown as PageJourneyMetricEvent),
    ).toThrow();
  });

  it('AC-17 clamps completed outcomes to the twelve safe metric buckets', () => {
    expect(journeyMetricOutcomeCategory(-1)).toBe('outcome_1');
    expect(journeyMetricOutcomeCategory(0)).toBe('outcome_1');
    expect(journeyMetricOutcomeCategory(11)).toBe('outcome_12');
    expect(journeyMetricOutcomeCategory(999)).toBe('outcome_12');
    expect(journeyMetricOutcomeCategory(Number.NaN)).toBe('outcome_1');
  });
});
