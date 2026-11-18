import { canonicalHash } from './deletion-canonical';
import {
  boundedCanonicalEvidence,
  parseRecoveryJson,
  processorEvidenceSchema,
} from './recovery-evidence';

function evidence() {
  const id = '60000000-0000-4000-8000-000000000001',
    termination = '60000000-0000-4000-8000-000000000002',
    storage = '60000000-0000-4000-8000-000000000003';
  return {
    schemaVersion: 1,
    jobId: id,
    mediaType: 'IMAGE',
    mediaId: id,
    attemptToken: id,
    processingInstanceId: id,
    manifestSha256: 'a'.repeat(64),
    termination: {
      platform: 'LOCAL',
      hostIdentitySha256: 'b'.repeat(64),
      observedAt: '2026-11-18T00:00:00Z',
      evidenceReference: `ops:${termination}`,
    },
    storageSettlement: {
      basis: 'PROVIDER_CONFIRMED',
      observedAt: '2026-11-18T00:00:00Z',
      evidenceReference: `ops:${storage}`,
    },
    evidenceRecords: [
      {
        id: termination,
        kind: 'TERMINATION',
        text: 'Synthetic terminated process evidence.',
      },
      {
        id: storage,
        kind: 'STORAGE_SETTLEMENT',
        text: 'Synthetic provider settlement evidence.',
      },
    ],
  };
}
describe('Recovery evidence canonical version 1', () => {
  it('keeps hashes stable across key order, evidence order, UUID casing and equivalent timestamps', () => {
    const original = evidence();
    const equivalent = {
      ...original,
      jobId: original.jobId.toUpperCase(),
      termination: {
        ...original.termination,
        observedAt: '2026-11-18T08:00:00+08:00',
      },
      evidenceRecords: [...original.evidenceRecords].reverse(),
    };
    expect(canonicalHash(processorEvidenceSchema.parse(equivalent))).toBe(
      canonicalHash(processorEvidenceSchema.parse(original)),
    );
    expect(canonicalHash({ b: 2, a: 1 })).toBe(canonicalHash({ a: 1, b: 2 }));
  });
  it('preserves evidence text instead of trimming or normalizing it', () => {
    const original = evidence(),
      changed = evidence();
    changed.evidenceRecords[0]!.text += ' ';
    expect(canonicalHash(processorEvidenceSchema.parse(original))).not.toBe(
      canonicalHash(processorEvidenceSchema.parse(changed)),
    );
  });
  it('rejects duplicate and escaped duplicate JSON keys before parsing can discard them', () => {
    for (const value of ['{"a":1,"a":2}', '{"nested":{"a":1,"\\u0061":2}}'])
      expect(() => parseRecoveryJson(value)).toThrow();
    expect(parseRecoveryJson('{"a":[true,false,null,2.5]}')).toEqual({
      a: [true, false, null, 2.5],
    });
  });
  it('rejects unknown fields, mismatched proof kinds, malformed references, excessive size, and deep input', () => {
    expect(
      processorEvidenceSchema.safeParse({ ...evidence(), extra: true }).success,
    ).toBe(false);
    const invalid = evidence();
    invalid.evidenceRecords[0]!.kind = 'STORAGE_SETTLEMENT';
    expect(processorEvidenceSchema.safeParse(invalid).success).toBe(false);
    expect(() => parseRecoveryJson(' '.repeat(16_385))).toThrow();
    expect(() =>
      boundedCanonicalEvidence({ text: 'x'.repeat(16_385) }),
    ).toThrow();
    expect(() =>
      parseRecoveryJson('['.repeat(40) + '0' + ']'.repeat(40)),
    ).toThrow();
  });
});
