# API transitive source and workspace dependency audit

Date: 2026-10-05

## Result

All 68 production API application and domain files were traversed through relative imports and shared workspace package exports. Their closure contains 94 source files and 210 import or export edges. No infrastructure, presentation, NestJS, Express, Prisma, database client, selected provider SDK, React, or Next.js dependency was found. No unresolved relative or Letterly package path and no computed import or require call occurred in this closure.

The ten declared runtime workspace dependency edges are acyclic. Contracts depend on templates, while API and web compose the lower packages. Development tooling dependencies are outside this runtime graph. This is stronger evidence than the earlier direct import audit, and does not change code or expand folders.

## Method and limits

The [audit artifact](2026-10-05-api-transitive-boundaries.json) records the source commit, counts, runtime workspace edges, and hashes of all reachable files. TypeScript syntax trees scanned 238 production API and shared package source files, excluding tests, generated Prisma output, and tools. Imports, reexports, literal dynamic imports, and literal require calls were followed. Relative paths resolve actual source files, and workspace names resolve their declared export paths. Type imports were included, so they cannot silently hide an outward source dependency.

The only external static specifiers in the reachable source closure are `node:crypto`, `node:stream`, and `zod`. The Node platform primitives and plain validation contracts are intentional; a stream type at a media port does not instantiate a storage adapter. This audit does not inspect third party package implementation graphs, every possible runtime loader pattern, or NestJS dependency injection cycles. A separate source search found no `forwardRef` calls, which is a useful signal but not proof of an acyclic runtime container.

No source change was needed. Existing lint restrictions remain the enforcement mechanism. These read only checks require no extra behavioral tests; the root lint, formatting, type, build, and relevant browser gates passed in the preceding source milestones. The final repository acceptance audit and wider specification reconciliation remain open.

[GPT-6 Luna independently approved the audit](2026-10-05-api-transitive-boundaries-luna.md) and confirmed that all 94 recorded source hashes match the current files. Its review keeps the runtime container and third party limits explicit.
