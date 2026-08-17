import 'dotenv/config';
import { loadConfig } from '@letterly/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getPrismaClient } from '@letterly/database';

const config = loadConfig();

export const auth = betterAuth({
  baseURL: config.BETTER_AUTH_URL,
  appName: 'Letterly',
  database: prismaAdapter(getPrismaClient(), {
    provider: 'postgresql',
  }),
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
});
