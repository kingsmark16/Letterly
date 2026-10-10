# Owner question controller verification

**Date**: 2026-10-03
**Result**: Verified by the implementing agent
**Contract**: [0022-owner-questions-controller.md](../specs/0022-repository-structure/0022-owner-questions-controller.md)

## Change and request flow

OwnerPageQuestionsController owns question create, list, reorder, update, and delete under `/api/v1/pages/:pageId/questions`, together with the existing error mapper. The order route precedes the question ID route. PagesModule registers the controller once. The existing seven controller unit cases now live beside it. PagesController loses 276 lines and its question service input. Seven constructor calls across media, password, and submissions tests lose the obsolete question placeholder so their remaining dependencies retain correct positions.

Requests authenticate and validate UUIDs and bodies before controller side effects. The list route reads with the session creator ID and validates a private projection. Each mutation applies the creator write limit before passing validated owner/version inputs to PageQuestionService. Update/delete preserve the false confirmation default and explicit true confirmation. Response schemas strip repository fields from successful results. The service/factory, persistence implementation, public controller, and web source remain unchanged.

Create retains HTTP 201. Other successes retain HTTP 200. Listing retains `private, no-store`; mutation headers retain their prior behavior. This extraction does not resolve the broader private mutation header consistency work. Existing errors preserve stable codes, safe messages, current version details, affected response counts, and retry timing.

## Verification

The existing composition suite registers the focused controller directly and no longer supplies an unrelated PageService fixture. Thirty one new cases extend the seven existing cases to thirty eight. They cover safe listing, successful order/update/delete, order route precedence, explicit confirmation forwarding, caller supplied identity stripping, all five guard and absent service paths, all four write limit rejection paths, unavailable limits, absent optional limits, malformed route/body inputs, missing/invalid/unsupported/branch/choice/key/limit mutation results, and redacted unexpected failures. Existing cases preserve create success, stale update metadata, destructive response confirmation details, missing ownership, malformed create input, required repository injection, and service overrides.

All focused HTTP tests passed on the first run. Root lint found a formatting mismatch in a chained reorder fixture. Splitting its setup into a typed local mock resolved the mismatch without changing production code. All focused cases passed again.

| Check                                    | Result                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Question HTTP and factory suite          | 38 passed                                                                                                                     |
| Relocated question controller unit cases | 7 passed within root tests                                                                                                    |
| Root lint                                | Passed                                                                                                                        |
| Root formatting                          | Passed                                                                                                                        |
| Root type checks                         | Passed                                                                                                                        |
| Root unit tests                          | 553 passed: API 499 across 63 suites, web 33, database 6, UI 15                                                               |
| API integration and composition          | 226 passed, 7 skipped; 17 passing and 4 skipped suites                                                                        |
| Production builds                        | Passed; API rebuilt, unchanged web/database builds reused valid Turborepo cache                                               |
| Source comparison                        | Five exact handler bodies/decorators and mapper, public controller unchanged, old handlers absent, single module registration |

## Limits and next work

Verification was performed by the implementing agent, without an independent fresh model review. Fixture guards prove route guard wiring, not live Better Auth sessions. Mocked persistence proves identity/version/confirmation forwarding and error handling, not live ownership isolation or destructive response transactions. Seven database cases remain skipped. No browser journeys, live provider calls, seeds, migrations, deployment, push, or pull request ran.

The next small extraction is the owner password mutation, reusing one shared HTTP error mapper with the public unlock route and preserving creator limiting, validation, and safe configuration failures. Broad controllers, private mutation cache header consistency, draft assumptions, compatibility types, template scaffolding, and the visible no JavaScript fallback issue remain. The parent migration stays In Progress.

Durable pages context records the new controller and test locations. Product scope statuses remain unchanged because this structure refactor does not complete another product feature. Historical inventory paths remain as the original review evidence.
