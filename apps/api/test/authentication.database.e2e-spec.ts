import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { loadConfig } from '@letterly/config';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import type { AuthMailPort } from '@letterly/contracts';
import { betterAuth } from 'better-auth';
import { createEmailVerificationToken } from 'better-auth/api';
import { createBetterAuthOptions } from '../src/modules/auth/infrastructure/better-auth';

const runRealDatabaseTests = process.env.RUN_REAL_DB_TESTS === '1';
const describeReal = runRealDatabaseTests ? describe : describe.skip;
const resetVerificationPrefix = 'reset-password:';

type JsonObject = Record<string, unknown>;

function jsonBody(value: JsonObject): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(value),
  };
}

function extractSessionCookie(response: Response): string {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Expected Better Auth to set a session cookie');
  }

  return setCookie.split(';', 1)[0] ?? setCookie;
}

describeReal('email and password authentication against Prisma', () => {
  jest.setTimeout(90_000);

  let prisma: PrismaClient;
  let auth: ReturnType<typeof betterAuth>;
  let config: ReturnType<typeof loadConfig>;
  let mail: AuthMailPort & {
    send: jest.MockedFunction<AuthMailPort['send']>;
  };
  const createdUserIds: string[] = [];
  const createdEmails: string[] = [];
  let requestIpNumber = 10;

  function nextRequestIp(): string {
    const ip = `198.51.100.${requestIpNumber}`;
    requestIpNumber += 1;
    return ip;
  }

  async function authRequest(
    path: string,
    init: RequestInit = {},
    ipAddress: string,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('x-letterly-client-ip', ipAddress);

    return auth.handler(
      new Request(`${config.BETTER_AUTH_URL}/api/auth${path}`, {
        ...init,
        headers,
      }),
    );
  }

  async function createCredentialUser(
    name: string,
    email: string,
    password: string,
    ipAddress: string,
  ): Promise<string> {
    const response = await authRequest(
      '/sign-up/email',
      jsonBody({ name, email, password }),
      ipAddress,
    );
    expect(response.status).toBe(200);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw new Error('Expected the credential user to be persisted');
    }

    createdUserIds.push(user.id);
    createdEmails.push(email);
    return user.id;
  }

  beforeAll(() => {
    config = loadConfig();
    prisma = getPrismaClient();
    const send = jest.fn<AuthMailPort['send']>().mockResolvedValue({
      ok: true,
      messageId: 'database-test-message',
    });
    mail = {
      send,
    };
    auth = betterAuth(
      createBetterAuthOptions(config, {
        database: prisma,
        mail,
      }),
    );
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.verification.deleteMany({
        where: {
          OR: [
            { value: { in: createdUserIds } },
            ...createdEmails.map((email) => ({ identifier: email })),
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    await disconnectPrisma();
  });

  it('verifies explicitly, signs in and out, then consumes reset tokens and revokes sessions', async () => {
    const email = `auth-lifecycle-${randomUUID()}@letterly.test`;
    const password = 'correct horse battery staple';
    const newPassword = 'new correct horse battery staple';
    const ipAddress = nextRequestIp();
    const userId = await createCredentialUser(
      'Lifecycle Creator',
      email,
      password,
      ipAddress,
    );

    const verificationToken = await createEmailVerificationToken(
      config.BETTER_AUTH_SECRET,
      email,
      undefined,
      24 * 60 * 60,
    );
    const verificationResponse = await authRequest(
      `/verify-email?token=${encodeURIComponent(verificationToken)}&callbackURL=${encodeURIComponent('https://attacker.example')}`,
      { method: 'GET' },
      ipAddress,
    );
    expect(verificationResponse.status).toBe(302);
    expect(verificationResponse.headers.get('location')).toContain(
      `${config.APP_ORIGIN}/verify-email`,
    );

    expect(
      await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      }),
    ).toEqual({ emailVerified: true });

    const signInResponse = await authRequest(
      '/sign-in/email',
      jsonBody({ email, password }),
      ipAddress,
    );
    expect(signInResponse.status).toBe(200);
    const sessionCookie = extractSessionCookie(signInResponse);

    const signOutResponse = await authRequest(
      '/sign-out',
      {
        method: 'POST',
        headers: { cookie: sessionCookie },
      },
      ipAddress,
    );
    expect(signOutResponse.status).toBe(200);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);

    const firstSessionResponse = await authRequest(
      '/sign-in/email',
      jsonBody({ email, password }),
      ipAddress,
    );
    const secondSessionResponse = await authRequest(
      '/sign-in/email',
      jsonBody({ email, password }),
      ipAddress,
    );
    expect(firstSessionResponse.status).toBe(200);
    expect(secondSessionResponse.status).toBe(200);
    expect(await prisma.session.count({ where: { userId } })).toBe(2);

    const resetRequestResponse = await authRequest(
      '/request-password-reset',
      jsonBody({ email }),
      ipAddress,
    );
    expect(resetRequestResponse.status).toBe(200);

    const resetVerification = await prisma.verification.findFirst({
      where: {
        identifier: { startsWith: resetVerificationPrefix },
        value: userId,
      },
      select: { identifier: true },
    });
    if (!resetVerification) {
      throw new Error('Expected a persisted password reset token');
    }
    const resetToken = resetVerification.identifier.slice(
      resetVerificationPrefix.length,
    );

    const resetResponse = await authRequest(
      '/reset-password',
      jsonBody({ newPassword, token: resetToken }),
      ipAddress,
    );
    expect(resetResponse.status).toBe(200);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    expect(
      await prisma.verification.findFirst({
        where: { identifier: resetVerification.identifier },
      }),
    ).toBeNull();

    const replayResponse = await authRequest(
      '/reset-password',
      jsonBody({ newPassword, token: resetToken }),
      ipAddress,
    );
    expect(replayResponse.status).toBe(400);

    const newPasswordSignInResponse = await authRequest(
      '/sign-in/email',
      jsonBody({ email, password: newPassword }),
      ipAddress,
    );
    expect(newPasswordSignInResponse.status).toBe(200);
  });

  it('returns the same safe status and body for wrong and correct passwords on an unverified account', async () => {
    const email = `auth-unverified-${randomUUID()}@letterly.test`;
    const password = 'unverified password';
    const ipAddress = nextRequestIp();
    await createCredentialUser(
      'Unverified Creator',
      email,
      password,
      ipAddress,
    );

    const wrongPasswordResponse = await authRequest(
      '/sign-in/email',
      jsonBody({ email, password: 'wrong password' }),
      ipAddress,
    );
    const correctPasswordResponse = await authRequest(
      '/sign-in/email',
      jsonBody({ email, password }),
      ipAddress,
    );

    expect(wrongPasswordResponse.status).toBe(401);
    expect(correctPasswordResponse.status).toBe(401);
    expect(await wrongPasswordResponse.text()).toBe(
      await correctPasswordResponse.text(),
    );
    expect(
      await prisma.session.count({
        where: {
          user: { email },
        },
      }),
    ).toBe(0);
  });

  it('keeps duplicate and OAuth only recovery requests generic without creating credential state', async () => {
    const email = `auth-oauth-only-${randomUUID()}@letterly.test`;
    const ipAddress = nextRequestIp();
    const userId = `oauth-only-${randomUUID()}`;
    await prisma.user.create({
      data: {
        id: userId,
        name: 'OAuth Only Creator',
        email,
        emailVerified: true,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: `google-${userId}`,
            providerId: 'google',
          },
        },
      },
    });
    createdUserIds.push(userId);
    createdEmails.push(email);

    const unknownResponse = await authRequest(
      '/request-password-reset',
      jsonBody({ email: `unknown-${randomUUID()}@letterly.test` }),
      ipAddress,
    );
    const oauthOnlyResponse = await authRequest(
      '/request-password-reset',
      jsonBody({ email }),
      ipAddress,
    );
    expect(oauthOnlyResponse.status).toBe(200);
    expect(await oauthOnlyResponse.text()).toBe(await unknownResponse.text());
    expect(
      await prisma.account.findFirst({
        where: { userId, providerId: 'credential' },
      }),
    ).toBeNull();
    expect(
      await prisma.verification.findFirst({
        where: { value: userId },
      }),
    ).toBeNull();

    const duplicateSignUpResponse = await authRequest(
      '/sign-up/email',
      jsonBody({
        name: 'Attacker Name',
        email,
        password: 'attacker password',
      }),
      ipAddress,
    );
    expect(duplicateSignUpResponse.status).toBe(200);
    expect(await prisma.account.findMany({ where: { userId } })).toHaveLength(
      1,
    );
    expect(
      await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
    ).toEqual({ name: 'OAuth Only Creator' });
  });
});
