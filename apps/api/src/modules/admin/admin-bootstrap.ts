import { randomUUID } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import { loadConfig } from '@letterly/config';
import { getPrismaClient, disconnectPrisma } from '@letterly/database';
import { PrismaAdminBootstrapRepository } from './admin-bootstrap.repository';
import {
  AdminBootstrapService,
  AdminBootstrapUserDisabledError,
  AdminBootstrapUserNotFoundError,
} from './admin-bootstrap.service';

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArgument(name: string): boolean {
  return process.argv.includes(name);
}

function secretsMatch(expected: string, received: string | undefined): boolean {
  if (!received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

async function main(): Promise<void> {
  const config = loadConfig();
  const userId = argumentValue('--user-id');
  const suppliedSecret = argumentValue('--secret');

  if (
    !config.ADMIN_BOOTSTRAP_SECRET ||
    !secretsMatch(config.ADMIN_BOOTSTRAP_SECRET, suppliedSecret)
  ) {
    throw new Error('Invalid administrator bootstrap secret');
  }
  if (!userId || !hasArgument('--confirm')) {
    throw new Error(
      'Usage requires --user-id <id> --confirm --secret <secret>',
    );
  }

  const repository = new PrismaAdminBootstrapRepository(getPrismaClient());
  const service = new AdminBootstrapService(repository);
  try {
    const result = await service.promote({
      userId,
      requestId: randomUUID(),
    });
    console.log(
      result.alreadyAdmin
        ? 'Administrator already provisioned.'
        : 'Administrator provisioned.',
    );
  } catch (error: unknown) {
    if (error instanceof AdminBootstrapUserNotFoundError) {
      throw new Error('Administrator bootstrap user was not found');
    }
    if (error instanceof AdminBootstrapUserDisabledError) {
      throw new Error('Administrator bootstrap user is disabled');
    }
    throw error;
  } finally {
    await disconnectPrisma();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Administrator bootstrap failed',
  );
  process.exitCode = 1;
});
