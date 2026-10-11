export const HEALTH_PROBE_TIMEOUT_MS = 5_000;

export class HealthProbeUnavailableError extends Error {
  constructor() {
    super('A required health probe did not complete successfully');
    this.name = 'HealthProbeUnavailableError';
  }
}

export class SingleFlightHealthProbe {
  private inFlight: Promise<void> | null = null;

  async run(operation: () => Promise<void>): Promise<void> {
    const inFlight = this.inFlight ?? this.start(operation);
    let timeout: NodeJS.Timeout | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () => reject(new HealthProbeUnavailableError()),
        HEALTH_PROBE_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([inFlight, deadline]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private start(operation: () => Promise<void>): Promise<void> {
    const inFlight = Promise.resolve().then(operation);
    this.inFlight = inFlight;
    void inFlight.then(
      () => this.release(inFlight),
      () => this.release(inFlight),
    );
    return inFlight;
  }

  private release(operation: Promise<void>): void {
    if (this.inFlight === operation) {
      this.inFlight = null;
    }
  }
}
