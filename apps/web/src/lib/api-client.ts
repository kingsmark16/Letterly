import {
  createPageRequestSchema,
  ownerPageProjectionSchema,
  pageIdParamsSchema,
  savePageRequestSchema,
  type CreatePageRequest,
  type OwnerPageProjection,
  type SavePageRequest,
} from '@letterly/contracts/pages';
import {
  apiErrorEnvelopeSchema,
  type ApiErrorDetails,
} from '@letterly/contracts/errors';
import axios from 'axios';

export type WebErrorCode =
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE';

export class WebApiError extends Error {
  readonly statusCode?: number;
  readonly code: WebErrorCode | string;
  readonly requestId?: string;
  readonly details?: ApiErrorDetails;

  constructor(input: {
    code: WebErrorCode | string;
    message: string;
    statusCode?: number;
    requestId?: string;
    details?: ApiErrorDetails;
  }) {
    super(input.message);
    this.name = 'WebApiError';
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

function toWebApiError(error: unknown): WebApiError {
  if (!axios.isAxiosError(error)) {
    if (error instanceof WebApiError) {
      return error;
    }

    return new WebApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'We received an unexpected response. Please try again.',
    });
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new WebApiError({
        code: 'TIMEOUT',
        message: 'The request took too long. Please try again.',
      });
    }

    return new WebApiError({
      code: 'OFFLINE',
      message: 'You appear to be offline. Reconnect and try again.',
    });
  }

  const parsed = apiErrorEnvelopeSchema.safeParse(error.response.data);

  if (parsed.success) {
    return new WebApiError(parsed.data);
  }

  return new WebApiError({
    code: 'MALFORMED_RESPONSE',
    message: 'The server returned an invalid response. Please try again.',
    statusCode: error.response.status,
  });
}

async function request<T>(
  callback: () => Promise<{ data: unknown }>,
  schema: { parse(value: unknown): T },
): Promise<T> {
  try {
    const response = await callback();
    return schema.parse(response.data);
  } catch (error: unknown) {
    if (error instanceof WebApiError) {
      throw error;
    }

    throw toWebApiError(error);
  }
}

export async function createPage(
  input: CreatePageRequest,
): Promise<OwnerPageProjection> {
  const payload = createPageRequestSchema.parse(input);

  return request(
    () => apiClient.post('/pages', payload),
    ownerPageProjectionSchema,
  );
}

export async function getOwnerPage(
  pageId: string,
): Promise<OwnerPageProjection> {
  const params = pageIdParamsSchema.parse({ pageId });

  return request(
    () => apiClient.get(`/pages/${params.pageId}`),
    ownerPageProjectionSchema,
  );
}

export async function savePage(
  pageId: string,
  input: SavePageRequest,
): Promise<OwnerPageProjection> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = savePageRequestSchema.parse(input);

  return request(
    () => apiClient.patch(`/pages/${params.pageId}`, payload),
    ownerPageProjectionSchema,
  );
}
