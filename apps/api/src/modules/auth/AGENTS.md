# Authentication module

## Overview

This module owns the Better Auth instance and its NestJS route boundary. The first release supports Google and Facebook sign in only. OAuth client secrets remain server side.

## Key files

| File                            | Owns                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `infrastructure/better-auth.ts` | Better Auth Prisma adapter and provider configuration |
| `auth.controller.ts`            | `/api/auth/*` request handoff to Better Auth          |
| `auth.module.ts`                | NestJS module registration                            |

## Conventions

- Use the shared validated configuration package for `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_ORIGIN`, and OAuth credentials.
- Keep Google and Facebook credentials out of browser code and logs.
- Keep CSRF, trusted origins, secure cookies, and Better Auth rate limits enabled.
- Add authorization guards and ownership policies at the API boundary as creator features are added.

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
