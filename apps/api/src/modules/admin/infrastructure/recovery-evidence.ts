import { z } from 'zod';
import type {
  ProcessorEvidence,
  UploadSettlementEvidence,
} from '../application/media-recovery';
import { canonicalJson } from './deletion-canonical';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const date = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const reference = z
  .string()
  .regex(/^ops:[a-fA-F0-9-]{36}$/)
  .transform((value) => value.toLowerCase())
  .refine((value) => uuid.safeParse(value.slice(4)).success);
export const processorEvidenceSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    jobId: uuid,
    mediaType: z.enum(['IMAGE', 'AUDIO']),
    mediaId: uuid,
    attemptToken: uuid,
    processingInstanceId: uuid,
    manifestSha256: digest,
    termination: z.strictObject({
      platform: z.enum(['AZURE_CONTAINER_APPS', 'LOCAL']),
      hostIdentitySha256: digest,
      observedAt: date,
      evidenceReference: reference,
    }),
    storageSettlement: z.strictObject({
      basis: z.enum(['NO_UNRESOLVED_WRITE', 'PROVIDER_CONFIRMED']),
      observedAt: date,
      evidenceReference: reference,
    }),
    evidenceRecords: z
      .array(
        z.strictObject({
          id: uuid,
          kind: z.enum(['TERMINATION', 'STORAGE_SETTLEMENT']),
          text: z.string().min(1).max(8000),
        }),
      )
      .length(2)
      .transform((rows) =>
        rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      ),
  })
  .superRefine((value, ctx) => {
    const ids = value.evidenceRecords.map((row) => `ops:${row.id}`);
    if (
      new Set(ids).size !== 2 ||
      !value.evidenceRecords.some(
        (row) =>
          `ops:${row.id}` === value.termination.evidenceReference &&
          row.kind === 'TERMINATION',
      ) ||
      !value.evidenceRecords.some(
        (row) =>
          `ops:${row.id}` === value.storageSettlement.evidenceReference &&
          row.kind === 'STORAGE_SETTLEMENT',
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid evidence references' });
  }) satisfies z.ZodType<ProcessorEvidence>;
export const uploadSettlementEvidenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  jobId: uuid,
  uploadManifestSha256: digest,
  observedAt: date,
  evidenceReference: reference,
  evidenceText: z.string().min(1).max(8000),
}) satisfies z.ZodType<UploadSettlementEvidence>;

/** JSON.parse discards duplicate keys, so reject them before schema validation. */
export function parseRecoveryJson(text: string): unknown {
  if (Buffer.byteLength(text, 'utf8') > 16_384)
    throw new Error('Invalid evidence');
  let offset = 0,
    nodes = 0;
  const whitespace = () => {
    while (/[\x20\t\r\n]/.test(text[offset] ?? '!')) offset++;
  };
  const string = (): string => {
    const start = offset++;
    while (offset < text.length) {
      const char = text[offset++];
      if (char === '\\') {
        offset++;
        continue;
      }
      if (char === '"') return JSON.parse(text.slice(start, offset)) as string;
    }
    throw new Error('Invalid evidence');
  };
  const value = (depth: number): unknown => {
    if (depth > 32 || ++nodes > 2000) throw new Error('Invalid evidence');
    whitespace();
    const char = text[offset];
    if (char === '"') return string();
    if (char === '{') {
      offset++;
      whitespace();
      const result: Record<string, unknown> = {},
        keys = new Set<string>();
      if (text[offset] === '}') {
        offset++;
        return result;
      }
      for (;;) {
        whitespace();
        if (text[offset] !== '"') throw new Error('Invalid evidence');
        const key = string();
        if (keys.has(key)) throw new Error('Invalid evidence');
        keys.add(key);
        whitespace();
        if (text[offset++] !== ':') throw new Error('Invalid evidence');
        const item = value(depth + 1);
        Object.defineProperty(result, key, {
          value: item,
          enumerable: true,
          writable: true,
          configurable: true,
        });
        whitespace();
        const next = text[offset++];
        if (next === '}') return result;
        if (next !== ',') throw new Error('Invalid evidence');
      }
    }
    if (char === '[') {
      offset++;
      whitespace();
      const rows: unknown[] = [];
      if (text[offset] === ']') {
        offset++;
        return rows;
      }
      for (;;) {
        rows.push(value(depth + 1));
        whitespace();
        const next = text[offset++];
        if (next === ']') return rows;
        if (next !== ',') throw new Error('Invalid evidence');
      }
    }
    for (const [literal, result] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ] as const)
      if (text.startsWith(literal, offset)) {
        offset += literal.length;
        return result;
      }
    const number = text
      .slice(offset)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!number) throw new Error('Invalid evidence');
    offset += number[0].length;
    const parsed = Number(number[0]);
    if (!Number.isFinite(parsed)) throw new Error('Invalid evidence');
    return parsed;
  };
  const result = value(0);
  whitespace();
  if (offset !== text.length) throw new Error('Invalid evidence');
  return result;
}
export function boundedCanonicalEvidence(value: unknown) {
  const canonical = canonicalJson(value);
  if (Buffer.byteLength(canonical, 'utf8') > 16_384)
    throw new Error('Invalid evidence');
  return canonical;
}
