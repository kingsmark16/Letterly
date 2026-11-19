import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { deletionImpactCountsSchema } from '@letterly/contracts';
import {
  AdminDeletionError,
  type DeletionTokenPort,
} from '../application/admin-deletions.repository';
import { canonicalHash } from './deletion-canonical';

const payloadSchema = z.strictObject({
  v: z.literal(1),
  purpose: z.enum([
    'page-deletion-confirmation',
    'creator-deletion-confirmation',
  ]),
  actorId: z.string(),
  targetId: z.string().min(1).max(200),
  expectedModerationVersion: z.number().int().nonnegative(),
  impactDigest: z.string().length(64),
  issuedAt: z.number(),
  expiresAt: z.number(),
});
export class DeletionToken implements DeletionTokenPort {
  constructor(private readonly secret: string) {}
  issue(input: Parameters<DeletionTokenPort['issue']>[0]) {
    const purpose = this.purpose(input.targetType);
    const issuedAt = input.now.getTime();
    const expiresAt = issuedAt + 300_000;
    const body = Buffer.from(
      JSON.stringify({
        v: 1,
        purpose,
        actorId: input.actorId,
        targetId: input.targetId,
        expectedModerationVersion: input.expectedModerationVersion,
        impactDigest: canonicalHash(
          deletionImpactCountsSchema.parse(input.counts),
        ),
        issuedAt,
        expiresAt,
      }),
    ).toString('base64url');
    return {
      confirmationToken: `${body}.${this.sign(body, purpose)}`,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }
  verify(token: string, input: Parameters<DeletionTokenPort['verify']>[1]) {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) throw new Error();
      const [body, signature] = parts as [string, string];
      const purpose = this.purpose(input.targetType);
      const expected = Buffer.from(this.sign(body, purpose));
      const received = Buffer.from(signature);
      if (
        expected.length !== received.length ||
        !timingSafeEqual(expected, received)
      )
        throw new Error();
      const value = payloadSchema.parse(
        JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
      );
      if (
        value.purpose !== purpose ||
        value.actorId !== input.actorId ||
        value.targetId !== input.targetId ||
        value.expectedModerationVersion !== input.expectedModerationVersion ||
        value.issuedAt > input.now.getTime() ||
        value.expiresAt <= input.now.getTime() ||
        value.expiresAt - value.issuedAt !== 300_000 ||
        value.impactDigest !== canonicalHash(input.counts)
      )
        throw new Error();
    } catch {
      throw new AdminDeletionError('STALE_DELETION_IMPACT');
    }
  }
  private purpose(targetType?: 'PAGE' | 'CREATOR') {
    return targetType === 'CREATOR'
      ? 'creator-deletion-confirmation'
      : 'page-deletion-confirmation';
  }
  private sign(body: string, purpose: string) {
    return createHmac('sha256', this.secret)
      .update(`${purpose}:${body}`)
      .digest('base64url');
  }
}
