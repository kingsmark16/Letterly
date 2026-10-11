# Template scaffold generator verification

Date: 2026-10-03

Spec: [0022 template scaffold generator](../specs/0022-repository-structure/0022-template-scaffold-generator.md).

This is implementation self verification, not an independent review. The parent repository structure migration remains In Progress.

## Result

The root command delegates to the templates workspace and creates only an unregistered definition, static renderer placeholder, and integration checklist. It reads the canonical catalog through the public package subpath and derives the repository root from its module location. It performs no source registration or database activation.

| Criterion               | Evidence                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1, CLI validation    | Help, valid arguments, dry run, missing/duplicate/unknown options, traversal, malformed keys, device names, and unsafe versions covered; CLI validation exits 1. Root pnpm command exercised directly.                                                                                                                                                                   |
| AC-2, identity          | Canonical registered identities reject every requested version. New categories and reused template keys in distinct categories resolve namespaced paths. Existing scaffold folders reject repeat and alternate version runs.                                                                                                                                             |
| AC-3, outputs           | Temporary workspace generation adds exactly the three specified files. Definition exports unregistered status, valid empty defaults/schemas, no capabilities, hidden audio, and empty publish requirements. Renderer has visible unimplemented content and no client directive, effects, or network calls.                                                               |
| AC-4, filesystem        | Dry run preserves the entire temporary tree. Case collisions and linked ancestors fail before writes. Injected failures prove cleanup removes unchanged owned files and empty directories, preserves concurrent edits/replacements/unrelated files, and reports partial writes or failed identity capture. Exclusive creation preserves files appearing after preflight. |
| AC-5, checklist         | Report contains all planned paths and eight registration steps. Unknown categories get pending metadata; existing categories need no new category record. Integration and provisioning remain pending.                                                                                                                                                                   |
| AC-6, repository checks | Generator tests participate in the root Turbo test task. Tools are included in TypeScript, ESLint, and Prettier checks. Generated source files compile in an isolated temporary workspace. Catalog, registry, package exports, lockfile, and seed bytes remain unchanged during invocation. Launch catalog remains one category and two templates.                       |

## Commands and outcomes

| Command                                                                                        | Outcome                                                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm scaffold:template --category celebration --template birthday-note --version 1 --dry-run` | PASS, prints three planned paths and pending registration checklist; creates nothing        |
| `pnpm --filter @letterly/templates test`                                                       | PASS, 46 tests                                                                              |
| `pnpm lint`                                                                                    | PASS, all lint tasks                                                                        |
| `pnpm format:check`                                                                            | PASS, maintained source/configuration                                                       |
| `pnpm check-types`                                                                             | PASS, all type check tasks                                                                  |
| `pnpm test`                                                                                    | PASS, 602 tests across five workspaces, including 46 generator tests                        |
| `pnpm build`                                                                                   | PASS, Prisma generation, NestJS build, and Next.js production build                         |
| `pnpm --filter api test:e2e --runInBand`                                                       | PASS, 568 tests; 7 database dependent tests skipped, 24 passing suites and 4 skipped suites |
| `git diff --check`                                                                             | PASS                                                                                        |

The final renderer change was followed by generator tests, workspace lint/type checks, and root formatting checks. Temporary fixtures were removed through bounded test cleanup. No live database seed, migration, deployment, push, or additional launch template was part of verification.

## Limits

This creates boilerplate, not a working template. Runtime registry/adapter maps still retain one implementation per registry key. Additional versions of existing identities are rejected. New content shapes still require draft update, projection, and contract decisions. Current seed behavior activates registered entries, so registration and provisioning remain explicit actions.

Existing `skills-lock.json` edits were preserved and excluded from the milestone.
