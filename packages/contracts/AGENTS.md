# Contracts package

## Overview

`@letterly/contracts` contains framework independent Zod schemas, inferred types, and provider interfaces shared across the web application and API.

## Key files

| File                              | Owns                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `packages/contracts/src/index.ts`         | Public exports for shared schemas and provider interfaces      |
| `packages/contracts/src/pages.ts`         | Page, publish, media, and public projection contracts          |
| `packages/contracts/src/questions.ts`     | Question authoring and safe question graph contracts           |
| `packages/contracts/src/reports.ts`       | Anonymous report contracts                                     |
| `packages/contracts/src/submissions.ts`   | Visitor submission and owner response contracts                |
| `packages/contracts/src/visitor-identity.ts` | Signed visitor identity contracts                            |
| `packages/contracts/package.json`         | Package exports and Zod dependency                             |

## Commands

```bash
pnpm --filter @letterly/contracts check-types
```

## Conventions

- Do not import application, framework, database, or provider client code.
- Keep schemas at transport boundaries and keep interfaces provider independent.
- Export named schemas, types, and interfaces.

_Drafted by /sync from the introducing change, worth a quick human pass._
