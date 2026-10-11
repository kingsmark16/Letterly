# ESLint configuration

## Overview

This package contains shared ESLint flat configurations for the workspaces. It is configuration only and should remain independent of application business logic.

## Key files

| File                                       | Owns                                |
| ------------------------------------------ | ----------------------------------- |
| `packages/eslint-config/base.js`           | Shared base rules                   |
| `packages/eslint-config/next.js`           | Next.js rules                       |
| `packages/eslint-config/react-internal.js` | React library rules                 |
| `packages/eslint-config/package.json`      | Exported configuration entry points |

## Conventions

- Keep rules compatible with ESLint 9 flat configuration.
- Add shared rules here instead of duplicating them in each application.
- `nest.js`, exported as `@repo/eslint-config/nest`, uses the shared `baseConfig` without the legacy warning conversion plugin, adds type checked Node/Jest rules, and rejects explicit any, floating promises, and unsafe arguments. API configuration supplies project paths, formatting, and feature import boundaries. Test files can change environment fixtures without the Turbo environment declaration rule.
- `library.js`, exported as `@repo/eslint-config/library`, owns the Node TypeScript library configuration. Consumers use `--max-warnings 0` and exclude generated clients.
- The Next configuration excludes local QA output and browser reports from lint.
- Do not add product code or runtime dependencies to this package.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
