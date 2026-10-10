# Media storage application port boundary

Date: 2026-10-03

## Result

The provider independent MediaStorage interface, MEDIA_STORAGE symbol, and safe storage errors moved unchanged from infrastructure/storage to modules/pages/application/media-storage.ts. All nine importing files were updated: page media, audio, cleanup services and their tests, PagesModule, and the R2 adapter and its test.

The application now owns the port required by its media use cases. R2Storage still implements the same methods in infrastructure. PagesModule still binds MEDIA_STORAGE with useExisting: R2Storage, preserving the existing provider instance rather than registering another client or provider.

The moved file was compared against its prior Git contents with line endings normalized and was unchanged. Upload signatures and headers, object reads, byte range streams, writes, deletes, error class names, and token construction remain identical. The R2 implementation and service behavior changed only in their imports. No HTTP contract, schema, storage key, bucket, provider configuration, transaction, or deployment changed.

## Decision and enforcement

The parent architecture wording now places framework independent port tokens beside application interfaces, matching the established repository ports and this authorized move. Nest infrastructure bindings remain in composition code. The token is a plain Symbol and introduces no framework import into the port.

Pages application/domain lint restrictions now block storage infrastructure paths and AWS SDK imports. Six probes verified the old storage contract path, concrete R2 adapter, application S3 client import, and domain signing SDK import are prohibited. The local application port and infrastructure database imports remain permitted. Existing database and template policy restrictions remain intact.

The application dependency scan now finds only the concrete image processor and unlock-cookie infrastructure imports. This does not imply the entire application layer is framework independent; existing Nest decorators and other provider boundaries remain part of the broader migration.

## Verification

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 540 passed, API 486, web 33, database 6, UI 15 |
| API integration | 39 passed, 7 skipped, four passing suites and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Dependency probes | Six expected results passed |

Existing media, audio, cleanup, and R2 tests verify behavior through the relocated contract. No duplicate tests were added for this mechanical move. Documentation pointers in both pages and storage context were reconciled.

## Limits and next work

Verification was performed by the implementing agent, not an independent fresh model reviewer. Tests mock provider operations and application dependencies. Live R2 requests, database checks, browser tests, seeds, migrations, and deployments were not run; seven database checks remain skipped. Prior browser results remain historical evidence.

The broader migration remains In Progress. Next, introduce an application image-processing port and bind the existing implementation at composition. Unlock-cookie transport dependencies, draft update compatibility assumptions, stored content types, and the known visible no JavaScript fallback issue remain further work.
