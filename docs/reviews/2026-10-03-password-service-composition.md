# Password service composition boundary

Date: 2026-10-03

## Result

PagePasswordService no longer imports NestJS or uses Injectable, Inject, or Optional decorators. Its plain constructor receives the existing repository, proof store, encryption key, and key version. Application token symbols and public service/error exports retain their paths. All method bodies were compared against the previous Git contents and match exactly.

PagesModule replaces the class shorthand registration with pagePasswordServiceProvider, a typed factory registered under the same PagePasswordService class token. It constructs one singleton from required repository/proof store tokens and optional key/version tokens. Passing undefined retains the existing constructor default of 1 for the key version. The existing validated configuration factories and infrastructure aliases remain unchanged. Consumers and overrideProvider(PagePasswordService) continue to resolve the same token.

The provider declaration stays in module composition rather than adding another layer or factory in application code. It is exported for isolated tests to exercise the production declaration. NestJS supports this factory and optional injection pattern through its [custom providers API](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory).

## Verification

Six new composition cases resolve the production factory in real Nest testing containers. They cover configured and omitted key versions, repository/key token overrides, singleton resolution, independent AES decryption with the injected key, password unlock, proof TTL/revocation arguments, absent optional configuration with safe encryption failure, password removal without a key, a service override without constructing missing dependencies, and each missing required dependency. Repository and proof storage remain mocks.

Existing HTTP integration suites build PagesModule and prove its consumers still construct and its class token overrides remain usable. Existing service unit suites cover proof verification and safe errors. No production password/proof algorithm changed.

| Check | Result |
| --- | --- |
| Root lint | Passed |
| Root formatting | Passed |
| Root type checks | Passed |
| Root unit tests | 552 passed, API 498 across 61 suites, web 33, database 6, UI 15 |
| API integration and composition | 46 passed, 7 skipped, five passing and four skipped suites |
| Production builds | Passed, API rebuilt and unchanged web/database builds reused valid Turborepo cache |
| Boundary probes | Seven expected results, four prohibited framework imports, two allowed plain imports, and unchanged decorator allowance in an unmigrated service |
| Service method comparison | Every method body matches the previous commit |

The service specific lint rule rejects NestJS and Express imports, including type imports. Existing database, HTTP infrastructure, storage, image, and template policy restrictions remain active. This enforcement targets the migrated service and does not claim that all application services are framework independent.

## Limits and next work

Verification was performed by the implementing agent. No independent fresh model review ran. Composition tests use real Nest containers and crypto with mocked repository/proof storage. Existing HTTP integration suites use mocked dependencies. Seven database tests remain skipped. Browser journeys, live database/provider validation, seeds, migrations, deployments, and remote publication were not run.

Next, apply the same module composition boundary to PageQuestionService while preserving its repository result mapping and mutation behavior. Remaining decorated services, broad controllers, draft update assumptions, compatibility types, template scaffolding, and the known visible no JavaScript fallback issue remain broader work. The parent repository structure migration remains In Progress.
