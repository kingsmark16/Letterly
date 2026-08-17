import { z } from "zod";

const r2FieldNames = [
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
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
    PAGE_PASSWORD_ENCRYPTION_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    PAGE_PASSWORD_ENCRYPTION_KEY_VERSION: z.string().min(1).default("1"),
    R2_ENDPOINT: z.string().url().optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    PUBLIC_MEDIA_PROXY_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).default(1),
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

    if (config.NODE_ENV === "production" || hasR2Configuration) {
      for (const field of r2FieldNames) {
        if (!config[field]) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required when R2 configuration is enabled`,
          });
        }
      }
    }

    if (config.NODE_ENV === "production" && !config.PUBLIC_MEDIA_PROXY_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["PUBLIC_MEDIA_PROXY_SECRET"],
        message: "PUBLIC_MEDIA_PROXY_SECRET is required in production",
      });
    }

    if (
      config.NODE_ENV === "production" &&
      !config.PAGE_PASSWORD_ENCRYPTION_KEY
    ) {
      context.addIssue({
        code: "custom",
        path: ["PAGE_PASSWORD_ENCRYPTION_KEY"],
        message: "PAGE_PASSWORD_ENCRYPTION_KEY is required in production",
      });
    }

    let appOrigin: URL | null = null;
    try {
      appOrigin = new URL(config.APP_ORIGIN);
    } catch {
      // The schema already reports malformed URLs. Keep the refinement focused
      // on production origin safety.
    }

    if (
      config.NODE_ENV === "production" &&
      (!appOrigin ||
        appOrigin.protocol !== "https:" ||
        appOrigin.username.length > 0 ||
        appOrigin.password.length > 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["APP_ORIGIN"],
        message:
          "APP_ORIGIN must be a credential-free https origin in production",
      });
    }
  });

const webConfigSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_ORIGIN: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .url()
        .refine(
          (value) =>
            value.startsWith("http://") || value.startsWith("https://"),
          "API_ORIGIN must use http or https",
        )
        .optional(),
    ),
    BETTER_AUTH_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    PUBLIC_MEDIA_PROXY_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).default(1),
  })
  .superRefine((config, context) => {
    if (
      config.NODE_ENV !== "development" &&
      config.NODE_ENV !== "test" &&
      !config.API_ORIGIN
    ) {
      context.addIssue({
        code: "custom",
        path: ["API_ORIGIN"],
        message: "API_ORIGIN is required outside development and test",
      });
    }

    if (config.NODE_ENV === "production" && !config.BETTER_AUTH_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "BETTER_AUTH_SECRET is required in production",
      });
    }

    if (config.NODE_ENV === "production" && !config.PUBLIC_MEDIA_PROXY_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["PUBLIC_MEDIA_PROXY_SECRET"],
        message: "PUBLIC_MEDIA_PROXY_SECRET is required in production",
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;
export type WebConfig = z.infer<typeof webConfigSchema>;

export function loadConfig(
  environment: Record<string, unknown> = process.env,
): AppConfig {
  return configSchema.parse(environment);
}

export function loadWebConfig(
  environment: Record<string, unknown> = process.env,
): WebConfig {
  return webConfigSchema.parse(environment);
}
