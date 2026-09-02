# Configuration package

## Overview

`@letterly/config` validates shared application environment values with Zod. It is framework independent and must not create database, Redis, R2, or authentication clients.

## Key files

| File                           | Owns                                              |
| ------------------------------ | ------------------------------------------------- |
| `packages/config/src/index.ts` | Environment schema, `AppConfig`, and `loadConfig` |
| `packages/config/package.json` | Package exports and type check command            |

## Commands

```bash
pnpm --filter @letterly/config check-types
```

## Conventions

- Keep startup validation explicit and fail with variable names, never secret values.
- Keep optional provider configuration optional until the related capability is enabled.
- OAuth client IDs and client secrets must be configured as complete pairs for Google and Facebook. Validation may leave both values absent while local provider credentials are not configured.
- Export named schemas, types, and functions.
- Follow the blueprint environment rules: separate development, staging, and production resources; never share databases or production R2 prefixes; expose only deliberate `NEXT_PUBLIC_` values to browser code; keep secrets server only; and maintain `.env.example` files with placeholders and descriptions.
- Keep environment examples with the deployable applications and database package. This package owns shared schemas and validation, not an independent runtime environment file.
- Production media deployments require all R2 fields and `PUBLIC_MEDIA_PROXY_SECRET`; development and test may omit provider values when those paths are not exercised.
- Production `APP_ORIGIN` must be an HTTPS URL without embedded user credentials.

_Drafted by /sync from the introducing change, worth a quick human pass._
