import type { ApiErrorCode, ApiErrorDetails } from '@letterly/contracts';
import { HttpException } from '@nestjs/common';

export interface ApiError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetails;
}

export class ApiException extends HttpException {
  constructor(error: ApiError) {
    super(error, error.statusCode);
  }

  toApiError(): ApiError {
    return this.getResponse() as ApiError;
  }
}
