import { Logger } from '@nestjs/common';
import { StructuredPublicPageReadFailureLogger } from './structured-public-page-read-failure-logger';

describe('StructuredPublicPageReadFailureLogger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('forwards the warning event with the existing PageService context', () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const adapter = new StructuredPublicPageReadFailureLogger();
    const event = {
      event: 'public_page_read_failed' as const,
      stage: 'page_repository' as const,
      errorName: 'Error',
      errorCode: 'P2024',
    };
    adapter.warn(event);
    expect(warn.mock.calls).toEqual([[event]]);
    expect(Reflect.get(warn.mock.contexts[0] ?? {}, 'context')).toBe(
      'PageService',
    );
  });
});
