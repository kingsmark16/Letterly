import { ReadinessUnavailableException } from '../http/api-exception';
import type { HealthCheckPort } from './health.tokens';
import { PostgresHealthIndicator } from './postgres-health.indicator';
import { RateLimitHealthIndicator } from './rate-limit-health.indicator';
import { ReadinessService } from './readiness.service';

describe('ReadinessService', () => {
  function terminusFailure(status: string): Error & {
    getStatus(): number;
    getResponse(): unknown;
  } {
    return Object.assign(new Error('health check failure'), {
      getStatus: () => 503,
      getResponse: () => ({ status }),
    });
  }

  function createService(check: HealthCheckPort['check']): ReadinessService {
    return new ReadinessService(
      { check },
      {} as PostgresHealthIndicator,
      {} as RateLimitHealthIndicator,
    );
  }

  it('checks PostgreSQL and critical Redis together', async () => {
    let calls = 0;
    let observedIndicators: Parameters<HealthCheckPort['check']>[0] = [];
    const check: HealthCheckPort['check'] = (indicators) => {
      calls += 1;
      observedIndicators = indicators;
      return Promise.resolve(undefined);
    };
    const service = createService(check);

    await expect(service.check()).resolves.toBeUndefined();

    expect(calls).toBe(1);
    expect(observedIndicators).toHaveLength(2);
    expect(
      observedIndicators.every((indicator) => typeof indicator === 'function'),
    ).toBe(true);
  });

  it('maps Terminus dependency failures to the safe readiness exception', async () => {
    const check: HealthCheckPort['check'] = () =>
      Promise.reject(terminusFailure('error'));
    const service = createService(check);

    await expect(service.check()).rejects.toBeInstanceOf(
      ReadinessUnavailableException,
    );
  });

  it('preserves unrelated service unavailable errors', async () => {
    const failure = terminusFailure('degraded');
    const check: HealthCheckPort['check'] = () => Promise.reject(failure);
    const service = createService(check);

    await expect(service.check()).rejects.toBe(failure);
  });

  it('preserves unexpected health check errors', async () => {
    const failure = new Error('unexpected internal failure');
    const check: HealthCheckPort['check'] = () => Promise.reject(failure);
    const service = createService(check);

    await expect(service.check()).rejects.toBe(failure);
  });

  it('marks the service draining and skips new dependency checks', async () => {
    let calls = 0;
    const check: HealthCheckPort['check'] = () => {
      calls += 1;
      return Promise.resolve(undefined);
    };
    const service = createService(check);

    service.beforeApplicationShutdown();

    await expect(service.check()).rejects.toBeInstanceOf(
      ReadinessUnavailableException,
    );
    expect(calls).toBe(0);
  });
});
