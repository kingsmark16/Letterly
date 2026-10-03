# `@repo/eslint-config`

Shared ESLint 9 flat configurations for Letterly workspaces. Import a configuration through its package export:

- `@repo/eslint-config/next-js` for the Next.js application.
- `@repo/eslint-config/nest` for the NestJS API, with type checked rules.
- `@repo/eslint-config/library` for Node TypeScript packages.
- `@repo/eslint-config/react-internal` for shared React components.

The API supplies its project service root, Prettier integration, and feature import restrictions locally. Shared configurations contain no application behavior. Workspace lint commands use `--max-warnings 0`; fixes run only through explicit fix commands.
