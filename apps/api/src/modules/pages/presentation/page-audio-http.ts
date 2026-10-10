import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { AudioStorageError } from '../application/page-audio.service';

export function parseAudioRange(
  rangeHeader: string | undefined,
): { start: number; end?: number } | undefined {
  if (!rangeHeader) return undefined;

  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    throw new ApiException({
      statusCode: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      code: 'BAD_REQUEST',
      message: 'The requested audio range is not supported',
    });
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (
    !Number.isSafeInteger(start) ||
    (end !== undefined && (!Number.isSafeInteger(end) || end < start))
  ) {
    throw new ApiException({
      statusCode: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      code: 'BAD_REQUEST',
      message: 'The requested audio range is not supported',
    });
  }

  return { start, end };
}

export async function pipeAudioResponse(
  body: NodeJS.ReadableStream,
  response: Response,
): Promise<void> {
  try {
    await pipeline(body, response);
  } catch (error: unknown) {
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    throw new AudioStorageError();
  }
}
