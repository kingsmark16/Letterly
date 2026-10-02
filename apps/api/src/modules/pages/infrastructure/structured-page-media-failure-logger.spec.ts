import { Logger } from '@nestjs/common';
import { StructuredPageMediaFailureLogger } from './structured-page-media-failure-logger';

describe('StructuredPageMediaFailureLogger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('forwards the bounded completion event using the existing logger context', () => {
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const adapter = new StructuredPageMediaFailureLogger();
    const event = {
      event: 'image_completion_failed' as const,
      stage: 'read_source',
      imageId: 'image-1',
      errorCode: 'AccessDenied',
      errorName: 'Error',
      statusCode: 503,
    };
    adapter.error(event);
    expect(error.mock.calls).toEqual([[event]]);
    expect(Reflect.get(error.mock.contexts[0] ?? {}, 'context')).toBe(
      'PageMediaService',
    );
  });
});
