import { Prisma, type PrismaClient } from '@letterly/database';
import { randomUUID } from 'node:crypto';
import {
  lockPageBarrier,
  lockUsers,
} from '../../../infrastructure/database/page-barrier';
import { AdminDeletionError } from '../application/admin-deletions.repository';
import type {
  ProcessorRecoveryInput,
  ProcessorRecoveryResult,
  RecoveryOperator,
  UploadSettlementEvidence,
} from '../application/media-recovery';
import { canonicalHash } from './deletion-canonical';
import {
  boundedCanonicalEvidence,
  processorEvidenceSchema,
  uploadSettlementEvidenceSchema,
} from './recovery-evidence';
import { deletionDatabaseNow } from './prisma-admin-deletions.repository';

type Tx = Prisma.TransactionClient;
const options = { maxWait: 10_000, timeout: 10_000 };
type ProcessorRecord = Prisma.MediaProcessingRecoveryGetPayload<
  Record<string, never>
>;
const result = (row: ProcessorRecord): ProcessorRecoveryResult => ({
  jobId: row.jobId,
  mediaType: row.mediaType,
  mediaId: row.mediaId,
  attemptToken: row.attemptToken,
  recoveryId: row.id,
  recordedAt: row.recordedAt.toISOString(),
});
async function authorize(tx: Tx, operator: RecoveryOperator) {
  const now = await deletionDatabaseNow(tx);
  const user = await tx.user.findUnique({
    where: { id: operator.id },
    select: { role: true, moderationStatus: true, deletionRequestedAt: true },
  });
  const session = await tx.session.findFirst({
    where: {
      id: operator.sessionId,
      userId: operator.id,
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
  if (
    !user ||
    user.role !== 'ADMIN' ||
    user.moderationStatus !== 'ACTIVE' ||
    user.deletionRequestedAt ||
    !session
  )
    throw new AdminDeletionError('FORBIDDEN');
  return now;
}
export class PrismaMediaRecoveryRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async inspectProcessor(
    operator: RecoveryOperator,
    input: { jobId: string; mediaType: 'IMAGE' | 'AUDIO'; mediaId: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockUsers(tx, [operator.id]);
      await authorize(tx, operator);
      const job = await tx.deletionJob.findUnique({
        where: { id: input.jobId },
        select: { targetType: true, targetId: true },
      });
      const row =
        input.mediaType === 'IMAGE'
          ? await tx.pageImage.findUnique({ where: { id: input.mediaId } })
          : await tx.pageAudio.findUnique({ where: { id: input.mediaId } });
      if (
        !job ||
        job.targetType !== 'PAGE' ||
        !row ||
        row.pageId !== job.targetId
      )
        throw new AdminDeletionError('NOT_FOUND');
      return {
        jobId: input.jobId,
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        attemptToken: row.attemptToken,
        processingInstanceId: row.processingInstanceId,
        processingHostIdentity: row.processingHostIdentity,
        processingStartedAt: row.processingStartedAt?.toISOString() ?? null,
        processingLeaseExpiresAt:
          row.processingLeaseExpiresAt?.toISOString() ?? null,
        processingState: row.processingState,
        storageWriteState: row.storageWriteState,
        manifestSha256: canonicalHash(row.outputManifest),
      };
    }, options);
  }
  async recoverProcessor(
    operator: RecoveryOperator,
    input: ProcessorRecoveryInput,
  ) {
    input = {
      ...input,
      evidence: processorEvidenceSchema.parse(input.evidence),
    };
    boundedCanonicalEvidence(input.evidence);
    const hash = canonicalHash(input.evidence);
    return this.prisma.$transaction(async (tx) => {
      await authorize(tx, operator);
      const where = {
        mediaType_mediaId_attemptToken: {
          mediaType: input.mediaType,
          mediaId: input.mediaId,
          attemptToken: input.attemptToken,
        },
      };
      const replay = await tx.mediaProcessingRecovery.findUnique({ where });
      if (replay) {
        await lockUsers(tx, [operator.id]);
        await authorize(tx, operator);
        return this.processorReplay(replay, input, hash);
      }
      const job = await tx.deletionJob.findUnique({
        where: { id: input.jobId },
      });
      if (!job || job.targetType !== 'PAGE')
        throw new AdminDeletionError('NOT_FOUND');
      const page = await lockPageBarrier(tx, job.targetId, {
        actorIds: [operator.id],
        allowDeletion: true,
      });
      if (!page || !page.deletionRequestedAt)
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${job.id}::uuid FOR UPDATE`;
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM ${Prisma.raw(input.mediaType === 'IMAGE' ? '"PageImage"' : '"PageAudio"')} WHERE "id"=${input.mediaId}::uuid FOR UPDATE`,
      );
      const now = await authorize(tx, operator);
      const prior = await tx.mediaProcessingRecovery.findUnique({ where });
      if (prior) return this.processorReplay(prior, input, hash);
      const current = await tx.deletionJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      const row =
        input.mediaType === 'IMAGE'
          ? await tx.pageImage.findUnique({ where: { id: input.mediaId } })
          : await tx.pageAudio.findUnique({ where: { id: input.mediaId } });
      const proof = input.evidence;
      if (
        !row ||
        row.pageId !== page.id ||
        row.attemptToken !== input.attemptToken ||
        row.processingInstanceId !== input.processingInstanceId ||
        row.processingState !== 'UNCERTAIN' ||
        !row.processingStartedAt ||
        !row.processingLeaseExpiresAt ||
        row.processingLeaseExpiresAt > now ||
        current.state !== 'NEEDS_ATTENTION' ||
        current.lastFailureCode !== 'PROCESSOR_QUIESCENCE_UNKNOWN'
      )
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      if (
        proof.jobId !== input.jobId ||
        proof.mediaType !== input.mediaType ||
        proof.mediaId !== input.mediaId ||
        proof.attemptToken !== input.attemptToken ||
        proof.processingInstanceId !== input.processingInstanceId ||
        proof.manifestSha256 !== canonicalHash(row.outputManifest) ||
        proof.termination.hostIdentitySha256 !==
          canonicalHash(row.processingHostIdentity)
      )
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      const host = row.processingHostIdentity as { platform?: unknown } | null;
      if (
        host?.platform !== proof.termination.platform ||
        [proof.termination.observedAt, proof.storageSettlement.observedAt].some(
          (value) =>
            new Date(value) < row.processingStartedAt! || new Date(value) > now,
        ) ||
        (proof.storageSettlement.basis === 'NO_UNRESOLVED_WRITE' &&
          !['NONE', 'SETTLED'].includes(row.storageWriteState))
      )
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      const saved = await tx.mediaProcessingRecovery.create({
        data: {
          jobId: job.id,
          mediaType: input.mediaType,
          mediaId: row.id,
          pageId: page.id,
          attemptToken: input.attemptToken,
          processingInstanceId: input.processingInstanceId,
          operatorId: operator.id,
          manifestSha256: proof.manifestSha256,
          evidenceSha256: hash,
          evidence: proof as unknown as Prisma.InputJsonValue,
          recordedAt: now,
        },
      });
      const data = {
        processingState: 'QUIESCED' as const,
        storageWriteState: 'SETTLED' as const,
        settledAt: now,
        processingLeaseExpiresAt: null,
      };
      if (input.mediaType === 'IMAGE')
        await tx.pageImage.update({ where: { id: row.id }, data });
      else await tx.pageAudio.update({ where: { id: row.id }, data });
      await tx.deletionJob.update({
        where: { id: job.id },
        data: { version: { increment: 1 } },
      });
      await tx.auditEvent.create({
        data: {
          actorId: operator.id,
          eventType: 'PROCESSOR_RECOVERY_RECORDED',
          targetType: 'PAGE',
          targetId: page.id,
          requestId: randomUUID(),
          outcome: 'SUCCESS',
          metadata: {
            jobId: job.id,
            mediaType: input.mediaType,
            mediaId: row.id,
            attemptToken: input.attemptToken,
            processingInstanceId: input.processingInstanceId,
            recoveryId: saved.id,
          },
        },
      });
      return result(saved);
    }, options);
  }
  private processorReplay(
    row: ProcessorRecord,
    input: ProcessorRecoveryInput,
    hash: string,
  ) {
    if (
      row.jobId !== input.jobId ||
      row.processingInstanceId !== input.processingInstanceId ||
      row.evidenceSha256 !== hash
    )
      throw new AdminDeletionError('IDEMPOTENCY_CONFLICT');
    return result(row);
  }
  async inspectUpload(operator: RecoveryOperator, jobId: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockUsers(tx, [operator.id]);
      await authorize(tx, operator);
      const job = await tx.deletionJob.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          uploadGrantsTotal: true,
          uploadManifestSha256: true,
          uploadsSafeAfter: true,
          uploadsSettledAt: true,
        },
      });
      if (!job || job.targetType !== 'PAGE')
        throw new AdminDeletionError('NOT_FOUND');
      return {
        jobId: job.id,
        targetType: job.targetType,
        targetId: job.targetId,
        uploadGrantsTotal: job.uploadGrantsTotal,
        uploadManifestSha256: job.uploadManifestSha256,
        uploadsSafeAfter: job.uploadsSafeAfter?.toISOString() ?? null,
        uploadsSettledAt: job.uploadsSettledAt?.toISOString() ?? null,
      };
    }, options);
  }
  async settleUploads(
    operator: RecoveryOperator,
    evidence: UploadSettlementEvidence,
  ) {
    evidence = uploadSettlementEvidenceSchema.parse(evidence);
    boundedCanonicalEvidence(evidence);
    const hash = canonicalHash(evidence);
    return this.prisma.$transaction(async (tx) => {
      await authorize(tx, operator);
      const replay = await tx.uploadGrantSettlement.findUnique({
        where: { jobId: evidence.jobId },
      });
      if (replay) {
        await lockUsers(tx, [operator.id]);
        await authorize(tx, operator);
        if (replay.evidenceSha256 !== hash)
          throw new AdminDeletionError('IDEMPOTENCY_CONFLICT');
        return {
          jobId: replay.jobId,
          recoveryId: replay.id,
          recordedAt: replay.recordedAt.toISOString(),
        };
      }
      const discovered = await tx.deletionJob.findUnique({
        where: { id: evidence.jobId },
      });
      if (!discovered || discovered.targetType !== 'PAGE')
        throw new AdminDeletionError('NOT_FOUND');
      const page = await lockPageBarrier(tx, discovered.targetId, {
        actorIds: [operator.id],
        allowDeletion: true,
      });
      if (!page?.deletionRequestedAt)
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${evidence.jobId}::uuid FOR UPDATE`;
      const now = await authorize(tx, operator),
        job = await tx.deletionJob.findUniqueOrThrow({
          where: { id: evidence.jobId },
        });
      const prior = await tx.uploadGrantSettlement.findUnique({
        where: { jobId: evidence.jobId },
      });
      if (prior) {
        if (prior.evidenceSha256 !== hash)
          throw new AdminDeletionError('IDEMPOTENCY_CONFLICT');
        return {
          jobId: prior.jobId,
          recoveryId: prior.id,
          recordedAt: prior.recordedAt.toISOString(),
        };
      }
      if (
        job.state !== 'NEEDS_ATTENTION' ||
        job.lastFailureCode !== 'UPLOAD_SETTLEMENT_UNKNOWN' ||
        !job.uploadManifestSha256 ||
        job.uploadManifestSha256 !== evidence.uploadManifestSha256 ||
        !job.uploadsSafeAfter ||
        job.uploadsSafeAfter > now ||
        new Date(evidence.observedAt) < job.uploadsSafeAfter ||
        new Date(evidence.observedAt) > now
      )
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      const saved = await tx.uploadGrantSettlement.create({
        data: {
          jobId: job.id,
          operatorId: operator.id,
          uploadManifestSha256: job.uploadManifestSha256,
          evidenceSha256: hash,
          evidence: evidence as unknown as Prisma.InputJsonValue,
          recordedAt: now,
        },
      });
      await tx.deletionJob.update({
        where: { id: job.id },
        data: { uploadsSettledAt: now, version: { increment: 1 } },
      });
      await tx.auditEvent.create({
        data: {
          actorId: operator.id,
          eventType: 'UPLOAD_SETTLEMENT_RECORDED',
          targetType: 'PAGE',
          targetId: job.targetId,
          requestId: randomUUID(),
          outcome: 'SUCCESS',
          metadata: { jobId: job.id, recoveryId: saved.id },
        },
      });
      return {
        jobId: job.id,
        recoveryId: saved.id,
        recordedAt: saved.recordedAt.toISOString(),
      };
    }, options);
  }
}
