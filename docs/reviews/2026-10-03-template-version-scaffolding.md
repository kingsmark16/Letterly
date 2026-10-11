# Template version scaffold verification

Date: 2026-10-03

Spec: [template version registration and retention](../specs/0022-repository-structure/0022-template-version-retention.md), third build step and AC-4. This supersedes the initial scaffold generator's temporary whole family prohibition.

Implementation self verification, not an independent review.

## Result

The generator accepts an unoccupied exact category/template/version identity beside registered or generated sibling versions. It preserves legacy v1 registry keys and derives category.template.vN for later versions. It rejects both a conflicting derived key and an already registered category/renderer/version tuple, including descriptors with nonstandard registry keys. CLI planning uses the full canonical descriptors, including inactive entries, rather than a flattened registry key list.

Filesystem preflight rejects an occupied exact source or presentation version directory, including an empty directory or partial output. It also rejects an existing exact checklist file. Shared family directories may exist so other versions remain intact. Existing root markers, contained paths, case checks, linked ancestor checks, exclusive creation, and owned byte/identity checked recovery remain in place. Legacy launch source paths are preserved.

Generation still creates only a definition placeholder, a server renderer placeholder, and a registration checklist. The renderer key is now the validated template name, separate from the immutable registry key. The checklist records explicit ACTIVE or INACTIVE provisioning, retention of earlier released implementations, and the transactional seed identity safeguards. No source registry, package export, runtime binding, catalog status, database row, or lockfile is modified by generation.

## Evidence

- The scaffold suite now has 54 cases, within 93 template package tests. Eight additional cases and amended existing checks cover registry key conflicts, registered exact tuples, generated v1 plus v2, legacy launch v1 plus v2, repeated exact generation, multiple categories and versions, dry run preservation, partial exact directories/checklists, case/link collisions beside v1, and failed v2 recovery.
- Both v1 and v2 generated definitions validate their empty defaults through the generated Zod schemas. Both definition and server renderer starters compile in isolated temporary workspaces. Tests assert distinct registry key, renderer key, version, and unregistered status.
- Existing failure cases still cover concurrent edits, partial writes, replacement files, loss of identity capture, and files appearing after preflight. Cleanup remains limited to this invocation's unchanged owned output.
- The CLI works outside the repository working directory. Its real module root and canonical launch catalog support a Secret Letter v2 dry run, while protected catalog, registry, and seed source bytes remain unchanged.
- The root delegated command `pnpm scaffold:template --category confession --template secret-letter --version 2 --dry-run` exits successfully and reports the three expected v2 paths and pending registrations. No starter was generated into the real workspace.

| Command | Outcome |
| --- | --- |
| `pnpm lint` | PASS, seven tasks |
| `pnpm format:check` | PASS |
| `pnpm check-types` | PASS, seven tasks |
| `pnpm test` | PASS, 718 tests across five workspaces, including 93 template tests and 557 API tests |
| `pnpm build` | PASS, fresh Prisma generation, NestJS build, and Next.js production build |
| Root Secret Letter v2 dry run | PASS, no files created |
| `git diff --check` | PASS |

## Limits and continuation

This milestone changes Node scaffold tooling and documentation. It has no API or web runtime source change. API integration and browser fixture journeys were not rerun for this tooling change; the preceding provisioning milestone recorded 595 API integration passes with seven database dependent skips, and 72 desktop/mobile browser passes. Those remain prior evidence rather than new results here.

No live seed, migration, new category activation, or additional launch template ran. An unregistered v2 starter has no implemented editor, API policy, persistence behavior, or public experience. Complete version specific metadata and the combined saved v1 versus v2 proof through actual API and web dispatch remain incomplete. The version retention spec and overall repository restructuring remain In Progress.
