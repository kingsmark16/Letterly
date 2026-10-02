export class TransientPublicReadError extends Error {
  constructor(cause: unknown) {
    super('Public repository read temporarily unavailable', { cause });
    this.name = 'TransientPublicReadError';
  }
}
