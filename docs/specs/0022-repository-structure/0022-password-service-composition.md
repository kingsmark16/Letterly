# 0022. Password service composition boundary

**Date**: 2026-10-03
**Status**: Complete

## Requirements

* AC-1: PagePasswordService has no NestJS imports or decorators. Preserve its plain constructor parameters, key version default, errors, tokens, and all method bodies.
* AC-2: PagesModule constructs one service through a typed factory registered under the existing PagePasswordService class token. Repository and proof store remain required. Encryption key and key version use optional factory injections, preserving the previous Optional decorators. Existing configuration token providers remain unchanged.
* AC-3: Verify configured encryption/unlock behavior, absent version fallback, absent key safe failure, required dependencies, singleton resolution, and service/token overrides through a real Nest testing container. Existing protected HTTP route suites still pass.
* AC-4: Enforce the service's framework boundary with lint. Run root lint, formatting, type checks, tests, build, and API integration checks. Keep the parent migration In Progress.

## Sources and implementation

The existing constructor supplies every service input and the existing module bindings supply each provider. Encryption configuration still comes from validated loadConfig values. The key version defaults to the existing literal 1 only when the injected value is undefined. Repository and proof store tokens remain application contracts. A named factory provider in pages.module.ts is the composition unit shared by production registration and isolated container tests; there is no additional application factory or service locator.

The existing parent specification selects factory composition for framework independent use cases. This slice extends the established ListOwnerPages pattern to PagePasswordService without changing password or proof behavior. Token symbols remain plain exports at their existing paths. Node crypto and shared encrypted password types remain explicit dependencies, with no new cryptography design, HTTP contract, schema, provider, or deployment.
