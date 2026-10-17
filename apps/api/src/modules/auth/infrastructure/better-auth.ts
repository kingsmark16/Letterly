import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@letterly/config';
import { getPrismaClient, type PrismaClient } from '@letterly/database';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { oAuthProxy } from 'better-auth/plugins';
import { createBetterAuthRateLimitStorage } from '../../../infrastructure/http/rate-limit.service';

const config = loadConfig();
const AUTH_INTERNAL_CLIENT_IP_HEADER = 'x-letterly-client-ip';
const AUTH_SIGN_OUT_RATE_LIMIT = { max: 10, windowSeconds: 60 } as const;
const authLogger = new Logger('BetterAuth');

export interface BetterAuthDependencies {
  database?: PrismaClient;
}

function createSafeBetterAuthLogger(): NonNullable<
  BetterAuthOptions['logger']
> {
  return {
    level: 'error',
    log: () => {
      // Better Auth may include provider responses or identity data in errors.
      authLogger.error({ operation: 'better_auth', outcome: 'failed' });
    },
  };
}

export function createBetterAuthOptions(
  config: AppConfig,
  dependencies: BetterAuthDependencies = {},
): BetterAuthOptions {
  const database = dependencies.database ?? getPrismaClient();
  const oauthProxyPlugin =
    config.OAUTH_PROXY_PRODUCTION_URL && config.OAUTH_PROXY_SECRET
      ? oAuthProxy({
          productionURL: config.OAUTH_PROXY_PRODUCTION_URL,
          currentURL: config.APP_ORIGIN,
          secret: config.OAUTH_PROXY_SECRET,
        })
      : undefined;

  return {
    baseURL: config.BETTER_AUTH_URL,
    appName: 'Letterly',
    logger: createSafeBetterAuthLogger(),
    database: prismaAdapter(database, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: false,
    },
    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      customStorage: createBetterAuthRateLimitStorage(config),
      customRules: {
        '/sign-out': {
          window: AUTH_SIGN_OUT_RATE_LIMIT.windowSeconds,
          max: AUTH_SIGN_OUT_RATE_LIMIT.max,
        },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: [AUTH_INTERNAL_CLIENT_IP_HEADER],
        ipv6Subnet: 64,
        trustedProxies: config.TRUSTED_PROXY_IPS,
      },
      useSecureCookies: config.NODE_ENV === 'production',
    },
    plugins: [...(oauthProxyPlugin ? [oauthProxyPlugin] : [])],
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
    trustedOrigins: [
      ...new Set([
        config.APP_ORIGIN,
        config.BETTER_AUTH_URL,
        ...(config.NODE_ENV === 'development'
          ? ['localhost', '127.0.0.1'].map((hostname) => {
              const origin = new URL(config.APP_ORIGIN);
              origin.hostname = hostname;
              return origin.origin;
            })
          : []),
        ...(config.OAUTH_PROXY_PRODUCTION_URL
          ? [config.OAUTH_PROXY_PRODUCTION_URL]
          : []),
      ]),
    ],
  };
}

export const auth = betterAuth(createBetterAuthOptions(config));
