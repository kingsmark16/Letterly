# Audio service composition boundary

Date: 2026-10-03

## Result

PageAudioService now takes plain repository, storage, and optional cleanup constructor inputs. A complete file comparison against the previous commit confirmed only framework wiring/token imports were removed, with repository and cleanup imports made type-only. Upload preparation, completion, retry, lease and expiry durations, rights statement version, error mapping, owner/public range streaming, and removal remain identical.

PagesModule registers pageAudioServiceProvider under the existing class token. PAGE_AUDIO_REPOSITORY and MEDIA_STORAGE remain required; the MediaCleanupService class token remains optional. Existing Prisma/R2 aliases, cleanup provider lifecycle registration, singleton resolution, and service overrides remain intact. This slice does not introduce a cleanup port or separate its scheduler.

## Verification

Sixteen new real Nest container cases exercise the production factory with mocked persistence and storage. They verify singleton resolution and overrides, upload signing input/response and safe failure recording, successful completion with the real file type detector, checksum mismatch before activation, exact owner/public scope and range forwarding, original stream object identity, range/storage error mapping, unavailable audio without storage I/O, removal with cleanup present or absent, cleanup ordering, successful removal despite immediate cleanup failure, no cleanup for an absent current track, required repository/storage failures, and service overrides without missing dependencies.

The initial focused run passed fifteen cases. Its completion fixture contained only an ID3 header, which the real detector did not recognize as MPEG audio. The test fixture was corrected to use an MPEG frame header and enough buffer data for detection. No production verification logic changed. All sixteen final focused cases passed. This fixture proves file type detection, not audio decoding or playback quality.

Existing audio unit tests remain green, including retry behavior, checksum and stored MIME rejection, range errors, and cleanup failure. The cleanup class still owns its existing scheduled worker; container tests inject a mock and do not start that worker.

| Check                            | Result                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Focused production factory suite | 16 passed                                                                       |
| Root lint                        | Passed                                                                          |
| Root formatting                  | Passed                                                                          |
| Root type checks                 | Passed                                                                          |
| Root unit tests                  | 552 passed: API 498 across 61 suites, web 33, database 6, UI 15                 |
| API integration and composition  | 131 passed, 7 skipped; thirteen passing and four skipped suites                 |
| Production builds                | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache |
| Boundary probes                  | Six expected results                                                            |
| Full service comparison          | Only wiring/import changes                                                      |

Framework import enforcement now includes audio. Probes reject NestJS decorators/types, Express types, and database types while allowing repository and storage port types. No React code changed in this milestone.

## Limits and next work

Verification was performed by the implementing agent; no independent fresh model review ran. Mocked ports prove composition, scope forwarding, and orchestration, not live ownership isolation, R2 signing/streaming, or transaction behavior. Seven database cases remain skipped. Browser journeys, seeds, migrations, deployments, and remote publication were not run.

Next, separate MediaCleanupService scheduling/lifecycle wiring from its cleanup application work, preserving periodic timing, shutdown cleanup, optional audio expiry, task leases, and immediate cleanup calls. The audio service still references that cleanup class as a type; a plain cleanup port can be addressed with that boundary. Remaining decorated services, broad controllers, private mutation response header consistency, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain further work. The parent repository migration stays In Progress.

The pages context records the durable composition boundary. Existing scope statuses remain unchanged because this refactor does not complete another product slice. The parent spec links this implementation contract and verification report.
