import axios from "axios";
import {
  apiErrorEnvelopeSchema,
  type ApiErrorDetails,
} from "@letterly/contracts/errors";

export type WebErrorCode = "OFFLINE" | "TIMEOUT" | "MALFORMED_RESPONSE";

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
    this.name = "WebApiError";
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

export function toWebApiError(error: unknown): WebApiError {
  if (!axios.isAxiosError(error)) {
    if (error instanceof WebApiError) {
      return error;
    }

    return new WebApiError({
      code: "MALFORMED_RESPONSE",
      message: "We received an unexpected response. Please try again.",
    });
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new WebApiError({
        code: "TIMEOUT",
        message: "The request took too long. Please try again.",
      });
    }

    return new WebApiError({
      code: "OFFLINE",
      message: "You appear to be offline. Reconnect and try again.",
    });
  }

  const parsed = apiErrorEnvelopeSchema.safeParse(error.response.data);

  if (parsed.success) {
    return new WebApiError(parsed.data);
  }

  return new WebApiError({
    code: "MALFORMED_RESPONSE",
    message: "The server returned an invalid response. Please try again.",
    statusCode: error.response.status,
  });
}
