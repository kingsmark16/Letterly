import {
  HEALTH_PROBE_TIMEOUT_MS,
  HealthProbeUnavailableError,
  SingleFlightHealthProbe,
} from './health-probe';

describe('SingleFlightHealthProbe', () => {
  it('shares concurrent checks and accepts a new check after completion', async () => {
    const probe = new SingleFlightHealthProbe();
    let resolvePending: (() => void) | undefined;
    const operation = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePending = resolve;
        }),
    );

    const first = probe.run(operation);
    const second = probe.run(operation);
    await Promise.resolve();

    expect(operation).toHaveBeenCalledTimes(1);

    resolvePending?.();
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);

    const nextOperation = jest.fn().mockResolvedValue(undefined);
    await expect(probe.run(nextOperation)).resolves.toBeUndefined();
    expect(nextOperation).toHaveBeenCalledTimes(1);
  });

  it('times out callers without starting duplicate work while the original is pending', async () => {
    jest.useFakeTimers();
    const probe = new SingleFlightHealthProbe();
    let resolvePending: (() => void) | undefined;
    const operation = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePending = resolve;
        }),
    );

    try {
      const first = probe.run(operation);
      const firstOutcome = expect(first).rejects.toBeInstanceOf(
        HealthProbeUnavailableError,
      );
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(HEALTH_PROBE_TIMEOUT_MS);
      await firstOutcome;

      const replacement = jest.fn().mockResolvedValue(undefined);
      const second = probe.run(replacement);
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);
      expect(replacement).not.toHaveBeenCalled();

      resolvePending?.();
      await expect(second).resolves.toBeUndefined();
      await expect(probe.run(replacement)).resolves.toBeUndefined();
      expect(replacement).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
