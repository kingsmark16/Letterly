import type { PrismaClient } from '@letterly/database';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import {
  SAFE_MONITORING,
  type SafeMonitoringPort,
} from '../monitoring/safe-monitoring';
import { PRISMA_CLIENT } from '../database/prisma-token';
import { PostgresHealthIndicator } from './postgres-health.indicator';

jest.mock('@nestjs/terminus', () => ({
  HealthIndicatorService: class HealthIndicatorService {},
}));

describe('PostgresHealthIndicator', () => {
  let module: TestingModule;
  let indicator: PostgresHealthIndicator;
  let queryRaw: jest.Mock;
  let recordMetric: jest.Mock;
  let upResult: HealthIndicatorResult<'postgres'>;
  let downResult: HealthIndicatorResult<'postgres'>;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([]);
    recordMetric = jest.fn();
    upResult = { postgres: { status: 'up' } };
    downResult = { postgres: { status: 'down' } };

    const healthIndicator = {
      check: jest.fn(() => ({
        up: () => upResult,
        down: () => downResult,
      })),
    } as unknown as HealthIndicatorService;
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
    const monitoring = {
      captureException: jest.fn(),
      recordMetric,
    } as SafeMonitoringPort;

    module = await Test.createTestingModule({
      providers: [
        PostgresHealthIndicator,
        { provide: PRISMA_CLIENT, useValue: prisma },
        { provide: HealthIndicatorService, useValue: healthIndicator },
        { provide: SAFE_MONITORING, useValue: monitoring },
      ],
    }).compile();
    indicator = module.get(PostgresHealthIndicator);
  });

  afterEach(async () => {
    await module.close();
  });

  it('maps permanent credential rejection to unhealthy and records one safe episode', async () => {
    queryRaw.mockRejectedValue(
      Object.assign(new Error('private database credential'), {
        code: 'P1000',
      }),
    );

    await expect(indicator.check()).resolves.toBe(downResult);
    await expect(indicator.check()).resolves.toBe(downResult);

    expect(recordMetric).toHaveBeenCalledTimes(1);
    expect(recordMetric).toHaveBeenCalledWith(
      'readiness_dependency_failure_episode_total',
      1,
      {
        operation: 'readiness_probe',
        outcome: 'authentication_rejected',
        provider: 'postgres',
      },
    );
    expect(JSON.stringify(recordMetric.mock.calls)).not.toContain(
      'private database credential',
    );
  });

  it('clears the episode latch after PostgreSQL recovers', async () => {
    queryRaw
      .mockRejectedValueOnce(Object.assign(new Error(), { code: '28P01' }))
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(Object.assign(new Error(), { code: 'P1000' }));

    await expect(indicator.check()).resolves.toBe(downResult);
    await expect(indicator.check()).resolves.toBe(upResult);
    await expect(indicator.check()).resolves.toBe(downResult);

    expect(recordMetric).toHaveBeenCalledTimes(2);
  });

  it('keeps transient failures unhealthy without reporting credential rejection', async () => {
    queryRaw.mockRejectedValue(Object.assign(new Error(), { code: 'P1001' }));

    await expect(indicator.check()).resolves.toBe(downResult);
    expect(recordMetric).not.toHaveBeenCalled();
  });

  it('propagates unexpected database errors for normal server error monitoring', async () => {
    const error = new Error('unexpected query implementation failure');
    queryRaw.mockRejectedValue(error);

    await expect(indicator.check()).rejects.toBe(error);
    expect(recordMetric).not.toHaveBeenCalled();
  });
});
