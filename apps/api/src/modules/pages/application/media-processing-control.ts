export const MEDIA_PROCESSING_CONTROL = Symbol('MEDIA_PROCESSING_CONTROL');
export interface ProcessingAttempt {
  kind: 'IMAGE' | 'AUDIO';
  creatorId: string;
  pageId: string;
  mediaId: string;
  attemptToken: string;
}
export interface MediaProcessingControl {
  recordGrant(
    input: Omit<ProcessingAttempt, 'attemptToken'> & {
      objectKey: string;
      issuedAt: Date;
      expiresAt: Date;
    },
  ): Promise<void>;
  beforeWrite(input: ProcessingAttempt & { objectKey: string }): Promise<void>;
  afterWrite(
    input: ProcessingAttempt,
    outcome: 'SETTLED' | 'UNCERTAIN',
  ): Promise<void>;
  settle(input: ProcessingAttempt): Promise<void>;
}
export class ProcessingUnavailableError extends Error {
  constructor() {
    super('Media attempt unavailable');
    this.name = 'ProcessingUnavailableError';
  }
}
