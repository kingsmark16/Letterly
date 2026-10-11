# API configuration infrastructure

## Overview

This area binds the validated shared environment configuration into NestJS. The `@letterly/config` package owns environment schemas and validation; this area owns API injection tokens and providers for values shared by feature modules.

## Key files

| File | Owns |
| --- | --- |
| `app-config.module.ts` | Shared `APP_ORIGIN` token and its provider from validated configuration |

## Conventions

- Read validated values through `loadConfig()`; do not duplicate environment parsing here.
- Register shared API configuration tokens once in `AppConfigModule`. Feature modules import it instead of sourcing shared tokens from another feature or registering duplicate providers.
- Keep NestJS providers and tokens out of application and domain code.

## Related specs

- [Stack and architecture](../../../../../docs/specs/0001-stack-and-architecture.md)
- [Repository structure](../../../../../docs/specs/0022-repository-structure/index.md)

_Drafted by /sync from the introducing change, worth a quick human pass._
