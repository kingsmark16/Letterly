export const DELETION_WORKER_REPOSITORY = Symbol('DELETION_WORKER_REPOSITORY');
export interface DeletionClaim {
  id: string;
  leaseOwner: string;
}
export interface DeletionWorkerRepository {
  claim(limit: number): Promise<DeletionClaim[]>;
  step(claim: DeletionClaim): Promise<void>;
  fail(claim: DeletionClaim, error: unknown): Promise<void>;
}
export class DeletionWorker {
  private inFlight: Promise<void> | null = null;
  constructor(private readonly repository: DeletionWorkerRepository) {}
  runOnce(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const run = this.run();
    this.inFlight = run;
    void run
      .finally(() => {
        if (this.inFlight === run) this.inFlight = null;
      })
      .catch(() => undefined);
    return run;
  }
  private async run() {
    let claimed = 0;
    while (claimed < 10) {
      const claims = await this.repository.claim(Math.min(2, 10 - claimed));
      if (!claims.length) return;
      claimed += claims.length;
      const results = await Promise.allSettled(
        claims.map(async (claim) => {
          try {
            await this.repository.step(claim);
          } catch (error: unknown) {
            await this.repository.fail(claim, error);
          }
        }),
      );
      for (const result of results)
        if (result.status === 'rejected') throw result.reason;
    }
  }
}
