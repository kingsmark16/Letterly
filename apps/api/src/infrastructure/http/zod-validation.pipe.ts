import { Injectable, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ApiException } from './api-exception';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new ApiException({
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Invalid request',
        details: {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.map(String),
            code: issue.code,
          })),
        },
      });
    }

    return result.data;
  }
}
