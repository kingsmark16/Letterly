import 'dotenv/config';
import { loadConfig } from '@letterly/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getPrismaClient } from '@letterly/database';

const config = loadConfig();

export const auth = betterAuth({
  baseURL: config.APP_ORIGIN,
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
  trustedOrigins: [config.APP_ORIGIN],
});
