import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { z } from 'zod';
import { disconnectPrisma, getPrismaClient } from '@letterly/database';
import { AdminDeletionError } from '../application/admin-deletions.repository';
import { PrismaMediaRecoveryRepository } from '../infrastructure/prisma-media-recovery.repository';
import {
  parseRecoveryJson,
  processorEvidenceSchema,
  uploadSettlementEvidenceSchema,
} from '../infrastructure/recovery-evidence';

function argumentsMap(values: string[]) {
  const args = new Map<string, string | boolean>();
  const keys = new Set([
    '--job-id',
    '--media-type',
    '--media-id',
    '--attempt-token',
    '--instance-id',
    '--evidence-file',
    '--confirm',
    '--inspect',
  ]);
  for (let index = 0; index < values.length; index++) {
    const key = values[index]!;
    if (key === '--' && index === 0) continue;
    if (!keys.has(key) || args.has(key)) throw new Error('Invalid arguments');
    if (key === '--confirm' || key === '--inspect') {
      args.set(key, true);
      continue;
    }
    const value = values[++index];
    if (!value || value.startsWith('--')) throw new Error('Invalid arguments');
    args.set(key, value);
  }
  return args;
}
export function readRecoveryEvidence(file: string) {
  const descriptor = openSync(file, 'r');
  try {
    if (!fstatSync(descriptor).isFile()) throw new Error('Invalid evidence');
    const bytes = Buffer.alloc(16_385);
    const length = readSync(descriptor, bytes, 0, bytes.length, 0);
    if (length > 16_384) throw new Error('Invalid evidence');
    return parseRecoveryJson(
      new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, length),
      ),
    );
  } finally {
    closeSync(descriptor);
  }
}
export async function runMediaRecoveryCommand(
  mode: 'PROCESSOR' | 'UPLOAD_GRANTS',
) {
  try {
    for (const name of [
      'DATABASE_URL',
      'NODE_ENV',
      'APP_ORIGIN',
      'BETTER_AUTH_URL',
      'BETTER_AUTH_SECRET',
    ])
      if (!process.env[name])
        throw new Error('Selected environment is required');
    // This credential is supplied directly to the operations command.
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    const cookie = process.env.LETTERLY_RECOVERY_SESSION_COOKIE;
    if (!cookie) throw new AdminDeletionError('FORBIDDEN');
    const args = argumentsMap(process.argv.slice(2)),
      inspect = args.get('--inspect') === true;
    if (
      inspect === !!args.get('--confirm') ||
      (inspect && args.has('--evidence-file'))
    )
      throw new Error('Invalid arguments');
    const uuid = z.uuid().transform((value) => value.toLowerCase());
    const jobId = uuid.parse(args.get('--job-id'));
    if (
      mode === 'UPLOAD_GRANTS' &&
      ['--media-id', '--media-type', '--attempt-token', '--instance-id'].some(
        (key) => args.has(key),
      )
    )
      throw new Error('Invalid arguments');
    if (
      inspect &&
      ['--attempt-token', '--instance-id'].some((key) => args.has(key))
    )
      throw new Error('Invalid arguments');
    const { auth } = await import('../../auth/infrastructure/better-auth.js');
    const session = await auth.api.getSession({
      headers: new Headers({ Cookie: cookie }),
    });
    if (!session) throw new AdminDeletionError('FORBIDDEN');
    const operator = { id: session.user.id, sessionId: session.session.id };
    const repository = new PrismaMediaRecoveryRepository(getPrismaClient());
    let result: unknown;
    if (mode === 'UPLOAD_GRANTS') {
      if (inspect) result = await repository.inspectUpload(operator, jobId);
      else {
        const evidence = uploadSettlementEvidenceSchema.parse(
          readRecoveryEvidence(
            z.string().min(1).parse(args.get('--evidence-file')),
          ),
        );
        if (evidence.jobId !== jobId) throw new Error('Invalid evidence');
        result = await repository.settleUploads(operator, evidence);
      }
    } else {
      const mediaType = z
          .enum(['IMAGE', 'AUDIO'])
          .parse(args.get('--media-type')),
        mediaId = uuid.parse(args.get('--media-id'));
      if (inspect)
        result = await repository.inspectProcessor(operator, {
          jobId,
          mediaType,
          mediaId,
        });
      else
        result = await repository.recoverProcessor(operator, {
          jobId,
          mediaType,
          mediaId,
          attemptToken: uuid.parse(args.get('--attempt-token')),
          processingInstanceId: uuid.parse(args.get('--instance-id')),
          evidence: processorEvidenceSchema.parse(
            readRecoveryEvidence(
              z.string().min(1).parse(args.get('--evidence-file')),
            ),
          ),
        });
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error: unknown) {
    process.stderr.write(
      `Recovery was not recorded (${error instanceof AdminDeletionError ? error.code : 'INVALID_INPUT_OR_DEPENDENCY'}).\n`,
    );
    process.exitCode = 1;
  } finally {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    delete process.env.LETTERLY_RECOVERY_SESSION_COOKIE;
    await disconnectPrisma();
  }
}
