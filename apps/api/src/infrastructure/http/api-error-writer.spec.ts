import type { Response } from 'express';
import { writeApiError } from './api-error-writer';

const requestId = '72465fc5-8278-4b5f-b4ab-6f1c4d692f60';

function createResponse(): jest.Mocked<
  Pick<Response, 'json' | 'setHeader' | 'status'>
> {
  const response = {
    json: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn(),
  };

  response.status.mockReturnValue(response);

  return response;
}

describe('writeApiError', () => {
  it('AC-2 writes the safe envelope and matching request ID header', () => {
    const response = createResponse();

    writeApiError(response as unknown as Response, requestId, {
      statusCode: 422,
      code: 'VALIDATION_FAILED',
      message: 'Invalid request',
      details: {
        issues: [
          {
            path: ['templateVersionId'],
            code: 'invalid_format',
          },
        ],
      },
    });

    expect(response.setHeader).toHaveBeenCalledWith('X-Request-ID', requestId);
    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 422,
      code: 'VALIDATION_FAILED',
      message: 'Invalid request',
      requestId,
      details: {
        issues: [
          {
            path: ['templateVersionId'],
            code: 'invalid_format',
          },
        ],
      },
    });
  });

  it('AC-8 adds the retry header only for rate limited errors', () => {
    const response = createResponse();

    writeApiError(response as unknown as Response, requestId, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: {
        retryAfterSeconds: 30,
      },
    });

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '30');
  });
});
