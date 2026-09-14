import 'dotenv/config';
import { Logger } from '@nestjs/common';
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_PUBLIC_MESSAGES,
  AUTH_RATE_LIMITS,
  AUTH_TOKEN_MAX_LENGTH,
  emailOnlyAuthRequestSchema,
  resetPasswordRequestSchema,
  signInEmailRequestSchema,
  signUpEmailRequestSchema,
  type AuthMailPort,
} from '@letterly/contracts';
import { loadConfig, type AppConfig } from '@letterly/config';
import { getPrismaClient, type PrismaClient } from '@letterly/database';
import {
  APIError,
  betterAuth,
  type BetterAuthOptions,
  type BetterAuthPlugin,
} from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createBetterAuthRateLimitStorage } from '../../../infrastructure/http/rate-limit.service';
import { createAuthMailService } from './auth-mail';

const config = loadConfig();

export const AUTH_EMAIL_VERIFICATION_EXPIRY_SECONDS = 24 * 60 * 60;
export const AUTH_PASSWORD_RESET_EXPIRY_SECONDS = 60 * 60;
export const AUTH_RESPONSE_TIMING_FLOOR_MS = 500;

const CREDENTIAL_PROVIDER_ID = 'credential';
const RESET_VERIFICATION_PREFIX = 'reset-password:';
const RESET_NO_CREDENTIAL_EMAIL = 'no-credential-reset@invalid.letterly';
const AUTH_INTERNAL_CLIENT_IP_HEADER = 'x-letterly-client-ip';
const AUTH_TIMING_SENSITIVE_PATHS = new Set([
  '/sign-in/email',
  '/sign-up/email',
  '/send-verification-email',
  '/verify-email',
  '/request-password-reset',
  '/reset-password',
]);

const authLogger = new Logger('BetterAuth');

export interface BetterAuthDependencies {
  database?: PrismaClient;
  mail?: AuthMailPort;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value) || typeof value[field] !== 'string') {
    return undefined;
  }

  return value[field];
}

function invalidAuthenticationDetails(): never {
  throw APIError.from('BAD_REQUEST', {
    code: 'INVALID_AUTH_INPUT',
    message: 'Invalid authentication details',
  });
}

function invalidResetToken(): never {
  throw APIError.from('BAD_REQUEST', {
    code: 'INVALID_RESET_TOKEN',
    message: AUTH_PUBLIC_MESSAGES.invalidResetToken,
  });
}

function unavailableAuthenticationService(): never {
  throw APIError.from('INTERNAL_SERVER_ERROR', {
    code: 'AUTHENTICATION_UNAVAILABLE',
    message: AUTH_PUBLIC_MESSAGES.genericFailure,
  });
}

function overwriteField(
  value: unknown,
  field: string,
  replacement: string,
): void {
  if (isRecord(value)) {
    Object.assign(value, { [field]: replacement });
  }
}

function replaceRecord(
  value: unknown,
  replacement: Record<string, unknown>,
): void {
  if (!isRecord(value)) {
    return;
  }

  for (const field of Object.keys(value)) {
    delete value[field];
  }

  Object.assign(value, replacement);
}

function getFixedCallbackUrls(appOrigin: string): {
  verification: string;
  passwordReset: string;
} {
  return {
    verification: new URL('/verify-email', appOrigin).toString(),
    passwordReset: new URL('/reset-password', appOrigin).toString(),
  };
}

function getResetToken(context: {
  body?: unknown;
  query?: unknown;
}): string | undefined {
  return (
    getStringField(context.body, 'token') ??
    getStringField(context.query, 'token')
  );
}

function logOperationalFailure(operation: string): void {
  authLogger.error({ operation, outcome: 'failed' });
}

function createSafeBetterAuthLogger(): NonNullable<
  BetterAuthOptions['logger']
> {
  return {
    level: 'error',
    log: () => {
      // Better Auth may include an email or provider response in its message
      // and variadic arguments. Keep only the local allowlisted event shape.
      logOperationalFailure('better_auth');
    },
  };
}

function waitForAuthResponseTiming(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, AUTH_RESPONSE_TIMING_FLOOR_MS);
  });
}

function runAuthBackgroundTask(promise: Promise<unknown>): void {
  void promise.catch(() => {
    logOperationalFailure('auth_background_task');
  });
}

function getMailMetadata(request?: Request): {
  requestId?: string;
  route?: string;
} {
  if (!request) {
    return {};
  }

  let route: string | undefined;
  try {
    route = new URL(request.url).pathname;
  } catch {
    route = undefined;
  }

  return {
    requestId: request.headers.get('x-request-id') ?? undefined,
    route,
  };
}

async function hasCredentialAccountForEmail(
  database: PrismaClient,
  email: string,
): Promise<boolean> {
  const user = await database.user.findUnique({
    where: { email },
    select: {
      accounts: {
        where: { providerId: CREDENTIAL_PROVIDER_ID },
        select: { id: true },
      },
    },
  });

  return Boolean(user?.accounts.length);
}

function createCredentialResetGuard(database: PrismaClient) {
  return async (
    account: { providerId: string; userId: string },
    context: { path?: string } | null,
  ): Promise<boolean | void> => {
    if (
      account.providerId !== CREDENTIAL_PROVIDER_ID ||
      context?.path !== '/reset-password'
    ) {
      return;
    }

    try {
      const credentialAccount = await database.account.findFirst({
        where: {
          userId: account.userId,
          providerId: CREDENTIAL_PROVIDER_ID,
        },
        select: { id: true },
      });

      return Boolean(credentialAccount);
    } catch {
      logOperationalFailure('password_reset_credential_guard');
      return false;
    }
  };
}

function isErrorResponse(
  value: unknown,
): value is { statusCode: number; body?: unknown } {
  return isRecord(value) && typeof value.statusCode === 'number';
}

function isRedirectStatus(statusCode: number): boolean {
  return statusCode >= 300 && statusCode < 400;
}

function createSafePublicError(
  path: string,
  returned: unknown,
): APIError | undefined {
  if (!isErrorResponse(returned) || isRedirectStatus(returned.statusCode)) {
    return undefined;
  }

  const isRateLimited = returned.statusCode === 429;
  const status = isRateLimited
    ? 'TOO_MANY_REQUESTS'
    : returned.statusCode >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'BAD_REQUEST';

  switch (path) {
    case '/sign-in/email':
      return APIError.from(status, {
        code: isRateLimited ? 'AUTH_RATE_LIMITED' : 'AUTHENTICATION_FAILED',
        message: isRateLimited
          ? AUTH_PUBLIC_MESSAGES.rateLimited
          : AUTH_PUBLIC_MESSAGES.signInFailure,
      });
    case '/sign-up/email':
      return APIError.from(status, {
        code: isRateLimited ? 'AUTH_RATE_LIMITED' : 'AUTH_SIGN_UP_FAILED',
        message: isRateLimited
          ? AUTH_PUBLIC_MESSAGES.rateLimited
          : AUTH_PUBLIC_MESSAGES.signUpFailure,
      });
    case '/send-verification-email':
    case '/request-password-reset':
      return APIError.from(status, {
        code: isRateLimited ? 'AUTH_RATE_LIMITED' : 'AUTH_EMAIL_ACTION_FAILED',
        message: isRateLimited
          ? AUTH_PUBLIC_MESSAGES.rateLimited
          : AUTH_PUBLIC_MESSAGES.emailActionRequested,
      });
    case '/verify-email':
      return APIError.from(status, {
        code: isRateLimited ? 'AUTH_RATE_LIMITED' : 'INVALID_VERIFICATION_LINK',
        message: isRateLimited
          ? AUTH_PUBLIC_MESSAGES.rateLimited
          : 'This verification link is invalid or expired.',
      });
    case '/reset-password':
      return APIError.from(status, {
        code: isRateLimited ? 'AUTH_RATE_LIMITED' : 'INVALID_AUTH_INPUT',
        message: isRateLimited
          ? AUTH_PUBLIC_MESSAGES.rateLimited
          : AUTH_PUBLIC_MESSAGES.genericFailure,
      });
    default:
      return undefined;
  }
}

function createEmailPasswordValidationMiddleware(
  config: AppConfig,
  database: PrismaClient,
) {
  const callbackUrls = getFixedCallbackUrls(config.APP_ORIGIN);

  return createAuthMiddleware(async (context) => {
    if (context.path === '/sign-up/email') {
      const result = signUpEmailRequestSchema.safeParse(context.body);
      if (!result.success) {
        invalidAuthenticationDetails();
      }

      replaceRecord(context.body, {
        ...result.data,
        callbackURL: callbackUrls.verification,
      });
    }

    if (context.path === '/sign-in/email') {
      const result = signInEmailRequestSchema.safeParse(context.body);
      if (!result.success) {
        invalidAuthenticationDetails();
      }

      replaceRecord(context.body, result.data);
    }

    if (context.path === '/send-verification-email') {
      const result = emailOnlyAuthRequestSchema.safeParse(context.body);
      if (!result.success) {
        invalidAuthenticationDetails();
      }

      replaceRecord(context.body, {
        ...result.data,
        callbackURL: callbackUrls.verification,
      });
    }

    if (context.path === '/request-password-reset') {
      const result = emailOnlyAuthRequestSchema.safeParse(context.body);
      if (!result.success) {
        invalidAuthenticationDetails();
      }

      let resetEmail = result.data.email;
      try {
        const user = await database.user.findUnique({
          where: { email: result.data.email },
          select: { id: true },
        });

        if (
          user &&
          !(await hasCredentialAccountForEmail(database, result.data.email))
        ) {
          resetEmail = RESET_NO_CREDENTIAL_EMAIL;
        }
      } catch {
        logOperationalFailure('password_reset_account_lookup');
        unavailableAuthenticationService();
      }

      replaceRecord(context.body, {
        email: resetEmail,
        redirectTo: callbackUrls.passwordReset,
      });
    }

    if (context.path === '/verify-email') {
      overwriteField(context.query, 'callbackURL', callbackUrls.verification);
    }

    if (context.path === '/reset-password/:token') {
      overwriteField(context.query, 'callbackURL', callbackUrls.passwordReset);
    }

    if (context.path === '/reset-password') {
      const result = resetPasswordRequestSchema.safeParse(context.body);
      if (!result.success) {
        invalidAuthenticationDetails();
      }

      const token = getResetToken(context);
      if (!token || token.length > AUTH_TOKEN_MAX_LENGTH) {
        invalidResetToken();
      }

      let verification: { value: string } | null;
      try {
        verification = await database.verification.findFirst({
          where: {
            identifier: RESET_VERIFICATION_PREFIX + token,
            expiresAt: { gt: new Date() },
          },
          select: { value: true },
        });
      } catch {
        logOperationalFailure('password_reset_token_lookup');
        unavailableAuthenticationService();
      }

      if (!verification) {
        invalidResetToken();
      }

      let credentialAccount: { id: string } | null;
      try {
        credentialAccount = await database.account.findFirst({
          where: {
            userId: verification.value,
            providerId: CREDENTIAL_PROVIDER_ID,
          },
          select: { id: true },
        });
      } catch {
        logOperationalFailure('password_reset_credential_lookup');
        unavailableAuthenticationService();
      }

      if (!credentialAccount) {
        invalidResetToken();
      }

      replaceRecord(context.body, {
        newPassword: result.data.newPassword,
        token,
      });
    }

    return undefined;
  });
}

function createSafeErrorMiddleware() {
  return createAuthMiddleware(async (context) => {
    if (AUTH_TIMING_SENSITIVE_PATHS.has(context.path)) {
      await waitForAuthResponseTiming();
    }

    const safeError = createSafePublicError(
      context.path,
      context.context.returned,
    );

    return Promise.resolve(safeError);
  });
}

function createSafeAuthResponsePlugin(): BetterAuthPlugin {
  return {
    id: 'letterly-safe-auth-response-status',
    async onResponse(response) {
      if (response.status !== 403) {
        return;
      }

      const responseBody = await response.clone().text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(responseBody) as unknown;
      } catch {
        return;
      }

      if (
        !isRecord(parsedBody) ||
        parsedBody.code !== 'AUTHENTICATION_FAILED'
      ) {
        return;
      }

      const headers = new Headers(response.headers);
      headers.delete('content-length');

      return {
        response: new Response(responseBody, {
          status: 401,
          statusText: 'Unauthorized',
          headers,
        }),
      };
    },
  };
}

export function createBetterAuthOptions(
  config: AppConfig,
  dependencies: BetterAuthDependencies = {},
): BetterAuthOptions {
  const database = dependencies.database ?? getPrismaClient();
  const mail = dependencies.mail ?? createAuthMailService(config);
  const validationMiddleware = createEmailPasswordValidationMiddleware(
    config,
    database,
  );
  const safeErrorMiddleware = createSafeErrorMiddleware();

  return {
    baseURL: config.BETTER_AUTH_URL,
    appName: 'Letterly',
    logger: createSafeBetterAuthLogger(),
    database: prismaAdapter(database, {
      provider: 'postgresql',
    }),
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: AUTH_EMAIL_VERIFICATION_EXPIRY_SECONDS,
      sendVerificationEmail: ({ user, url, token }, request) => {
        runAuthBackgroundTask(
          mail.send({
            type: 'verification',
            userId: user.id,
            recipient: user.email,
            url,
            token,
            ...getMailMetadata(request),
          }),
        );
        return Promise.resolve();
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
      maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
      resetPasswordTokenExpiresIn: AUTH_PASSWORD_RESET_EXPIRY_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url, token }, request) => {
        try {
          const hasCredentialAccount = await hasCredentialAccountForEmail(
            database,
            user.email,
          );

          if (!hasCredentialAccount) {
            return;
          }
        } catch {
          logOperationalFailure('password_reset_mail_account_lookup');
          return;
        }

        runAuthBackgroundTask(
          mail.send({
            type: 'password-reset',
            userId: user.id,
            recipient: user.email,
            url,
            token,
            ...getMailMetadata(request),
          }),
        );
      },
      // A separate sign-in keeps sign-up responses generic for existing emails.
      autoSignIn: false,
    },
    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      customStorage: createBetterAuthRateLimitStorage(config),
      customRules: {
        '/sign-in/email': {
          window: AUTH_RATE_LIMITS.signIn.windowSeconds,
          max: AUTH_RATE_LIMITS.signIn.max,
        },
        '/sign-up/email': {
          window: AUTH_RATE_LIMITS.signUp.windowSeconds,
          max: AUTH_RATE_LIMITS.signUp.max,
        },
        '/sign-out': {
          window: AUTH_RATE_LIMITS.signOut.windowSeconds,
          max: AUTH_RATE_LIMITS.signOut.max,
        },
        '/send-verification-email': {
          window: AUTH_RATE_LIMITS.verificationResend.windowSeconds,
          max: AUTH_RATE_LIMITS.verificationResend.max,
        },
        '/verify-email': {
          window: AUTH_RATE_LIMITS.verificationLinkRequest.windowSeconds,
          max: AUTH_RATE_LIMITS.verificationLinkRequest.max,
        },
        '/request-password-reset': {
          window: AUTH_RATE_LIMITS.passwordResetRequest.windowSeconds,
          max: AUTH_RATE_LIMITS.passwordResetRequest.max,
        },
        '/reset-password': {
          window: AUTH_RATE_LIMITS.passwordResetSubmission.windowSeconds,
          max: AUTH_RATE_LIMITS.passwordResetSubmission.max,
        },
      },
    },
    advanced: {
      backgroundTasks: {
        handler: runAuthBackgroundTask,
      },
      ipAddress: {
        ipAddressHeaders: [AUTH_INTERNAL_CLIENT_IP_HEADER],
        ipv6Subnet: 64,
        trustedProxies: config.TRUSTED_PROXY_IPS,
      },
      useSecureCookies: config.NODE_ENV === 'production',
    },
    plugins: [createSafeAuthResponsePlugin()],
    socialProviders: {
      ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: config.GOOGLE_CLIENT_ID,
              clientSecret: config.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
      ...(config.FACEBOOK_CLIENT_ID && config.FACEBOOK_CLIENT_SECRET
        ? {
            facebook: {
              clientId: config.FACEBOOK_CLIENT_ID,
              clientSecret: config.FACEBOOK_CLIENT_SECRET,
            },
          }
        : {}),
    },
    trustedOrigins: [...new Set([config.APP_ORIGIN, config.BETTER_AUTH_URL])],
    databaseHooks: {
      account: {
        create: {
          before: createCredentialResetGuard(database),
        },
      },
    },
    hooks: {
      before: validationMiddleware,
      after: safeErrorMiddleware,
    },
  };
}

export const auth = betterAuth(createBetterAuthOptions(config));
