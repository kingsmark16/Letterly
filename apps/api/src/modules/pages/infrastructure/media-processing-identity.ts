import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { loadConfig, resolveHostedProcessingIdentity } from '@letterly/config';
import type { Prisma } from '@letterly/database';
import { ProcessingUnavailableError } from '../application/media-processing-control';

export const processingInstanceId = randomUUID();
let startedAt: Date | undefined;
export async function processingIdentity(tx: Prisma.TransactionClient) {
  const config = loadConfig();
  const identity = resolveHostedProcessingIdentity(config);
  if (
    identity.status === 'partial' ||
    (identity.status === 'none' && config.NODE_ENV === 'production')
  )
    throw new ProcessingUnavailableError();
  startedAt ??= (
    await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
  )[0]!.now;
  if (identity.status === 'azure') {
    return {
      platform: 'AZURE_CONTAINER_APPS' as const,
      appName: identity.appName,
      revisionName: identity.revisionName,
      replicaName: identity.replicaName,
      hostname: null,
      processId: null,
      processStartedAt: startedAt.toISOString(),
    };
  }
  return {
    platform: 'LOCAL' as const,
    appName: null,
    revisionName: null,
    replicaName: null,
    hostname: hostname().slice(0, 253),
    processId: process.pid,
    processStartedAt: startedAt.toISOString(),
  };
}
export async function claimMediaProcessing(
  tx: Prisma.TransactionClient,
  kind: 'IMAGE' | 'AUDIO',
  id: string,
  pageId: string,
  sourceStorageKey: string | null,
) {
  const row =
    kind === 'IMAGE'
      ? await tx.pageImage.findUnique({
          where: { id },
          select: { processingState: true, state: true, attemptToken: true },
        })
      : await tx.pageAudio.findUnique({
          where: { id },
          select: { processingState: true, state: true, attemptToken: true },
        });
  if (
    !row ||
    row.processingState === 'RUNNING' ||
    row.processingState === 'UNCERTAIN' ||
    (!row.attemptToken && ['VERIFYING', 'SANITIZING'].includes(row.state))
  )
    return null;
  const host = await processingIdentity(tx);
  const now = (
    await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
  )[0]!.now;
  return {
    attemptToken: randomUUID(),
    processingState: 'RUNNING' as const,
    processingInstanceId,
    processingHostIdentity: host,
    processingStartedAt: now,
    processingLeaseExpiresAt: new Date(now.getTime() + 180_000),
    settledAt: null,
    outputManifest: [
      ...new Set([
        ...(sourceStorageKey ? [sourceStorageKey] : []),
        ...(kind === 'IMAGE' ? [`pages/${pageId}/images/${id}.webp`] : []),
      ]),
    ].sort(),
    storageWriteState: 'NONE' as const,
  };
}
