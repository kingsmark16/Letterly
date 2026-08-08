import { z } from "zod";

const r2FieldNames = [
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
] as const;

const configSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_ORIGIN: z.string().url().default("http://localhost:3000"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    FACEBOOK_CLIENT_ID: z.string().min(1).optional(),
    FACEBOOK_CLIENT_SECRET: z.string().min(1).optional(),
    REDIS_URL: z.string().url().optional(),
    R2_ENDPOINT: z.string().url().optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
  })
  .superRefine((config, context) => {
    const oauthPairs = [
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    ] as const;

    for (const [clientIdField, clientSecretField] of oauthPairs) {
      const hasClientId = Boolean(config[clientIdField]);
      const hasClientSecret = Boolean(config[clientSecretField]);

      if (hasClientId === hasClientSecret) {
        continue;
      }

      const missingField = hasClientId ? clientSecretField : clientIdField;
      context.addIssue({
        code: "custom",
        path: [missingField],
        message: `${missingField} is required when the OAuth provider is configured`,
      });
    }

    const hasR2Configuration = r2FieldNames.some((field) => config[field]);

    if (!hasR2Configuration) {
      return;
    }

    for (const field of r2FieldNames) {
      if (!config[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when R2 configuration is enabled`,
        });
      }
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(
  environment: Record<string, unknown> = process.env,
): AppConfig {
  return configSchema.parse(environment);
}
