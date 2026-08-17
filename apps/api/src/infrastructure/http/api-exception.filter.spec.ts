import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiException } from './api-exception';
import type { RequestWithContext } from './request-context';

const requestId = '72465fc5-8278-4b5f-b4ab-6f1c4d692f60';

function createResponse(): jest.Mocked<
  Pick<Response, 'json' | 'setHeader' | 'status'>
> & { headersSent: boolean } {
  const response = {
    headersSent: false,
    json: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn(),
  };

  response.status.mockReturnValue(response);

  return response;
}

function createHost(
  request: RequestWithContext,
  response: Response,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: <T>(): T => request as unknown as T,
      getResponse: <T>(): T => response as unknown as T,
    }),
  } as unknown as ArgumentsHost;
}

describe('ApiExceptionFilter', () => {
  const adapterHost = {
    httpAdapter: {},
  } as HttpAdapterHost;

  it('AC-2 serializes typed errors without changing their safe fields', () => {
    const request = {
      path: '/api/v1/pages',
      requestId,
    } as RequestWithContext;
    const response = createResponse();
    const filter = new ApiExceptionFilter(adapterHost);

    filter.catch(
      new ApiException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      }),
      createHost(request, response as unknown as Response),
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
      requestId,
    });
  });

  it('AC-6 converts an unexpected error to the fixed safe response', () => {
    const request = {
      path: '/api/v1/pages',
      requestId,
    } as RequestWithContext;
    const response = createResponse();
    const filter = new ApiExceptionFilter(adapterHost);

    filter.catch(
      new Error('database credentials and letter body must not escape'),
      createHost(request, response as unknown as Response),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    });
  });
});
