import { BadRequestException } from '@nestjs/common';
import {
  createPageRequestSchema,
  type CreatePageRequest,
} from '@letterly/contracts/pages';
import { ZodValidationPipe } from './zod-validation.pipe';

const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe<CreatePageRequest>(
    createPageRequestSchema,
  );

  it('AC-1 returns only fields allowed by the create page contract', () => {
    const result = pipe.transform({
      templateVersionId,
      creatorId: 'browser-controlled-value',
    });

    expect(result).toEqual({
      templateVersionId,
    });
    expect(result).not.toHaveProperty('creatorId');
  });

  it('AC-10 returns a safe validation error for invalid input', () => {
    let error: unknown;

    try {
      pipe.transform({
        templateVersionId: 'not-a-uuid',
      });
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(BadRequestException);

    const response = (error as BadRequestException).getResponse() as unknown;

    expect(isRecord(response)).toBe(true);

    if (!isRecord(response)) {
      throw new Error('Expected a validation error response object');
    }

    expect(response.code).toBe('VALIDATION_FAILED');
    expect(response.message).toBe('Invalid request');

    const details = response.details;

    expect(isUnknownArray(details)).toBe(true);

    if (!isUnknownArray(details)) {
      throw new Error('Expected validation error details');
    }

    const hasTemplateVersionIdIssue = details.some((detail: unknown) => {
      if (!isRecord(detail)) {
        return false;
      }

      const path = detail.path;

      return (
        isUnknownArray(path) &&
        path.length === 1 &&
        path[0] === 'templateVersionId'
      );
    });

    expect(hasTemplateVersionIdIssue).toBe(true);
    expect('templateVersionId' in response).toBe(false);
  });
});
