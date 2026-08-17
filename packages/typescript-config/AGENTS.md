# TypeScript configuration

## Overview

This package contains shared TypeScript compiler configurations for applications and libraries. It centralizes strict compiler behavior so workspaces use the same baseline.

## Key files

| File                                            | Owns                            |
| ----------------------------------------------- | ------------------------------- |
| `packages/typescript-config/base.json`          | Shared compiler defaults        |
| `packages/typescript-config/nextjs.json`        | Next.js compiler settings       |
| `packages/typescript-config/react-library.json` | React library compiler settings |

## Conventions

- Keep shared compiler settings strict and framework independent where possible.
- Add a specialized config only when a workspace has a real compiler need.
- Do not place application code in this package.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
