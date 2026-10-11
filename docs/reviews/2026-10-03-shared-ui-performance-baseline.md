# Shared UI performance baseline

The accepted design system spec requires a baseline before migrating shared primitives. That evidence was missing. The current landing page is now measured, and the same check enforces the recorded migration budgets.

## Measured state

The canonical fixture is [landing-ui-baseline.json](../../apps/web/e2e/fixtures/landing-ui-baseline.json). It records the unchanged application source at commit `0717c1f`, Chromium 151.0.7922.34, both viewport profiles, device scale, resource paths, decoded response sizes, font content hashes, and observed layout shifts.

| Profile | Viewport | CSS bytes | Client JavaScript bytes | Font requests | Font bytes | Initial observed CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desktop Chromium | 1440 × 900 | 451,379 | 1,173,075 | 10 | 428,152 | 0 |
| Mobile Chromium emulation | 390 × 900 | 451,379 | 1,173,075 | 10 | 428,152 | 0 |

The first two baseline measurements and three subsequent runs per profile produce the same asset totals, font counts, and zero observed shifts. The ten fonts include the current Fraunces, Manrope, and Geist assets. This milestone preserves them rather than retuning the design.

## Measurement and gate

`apps/web/e2e/ui-performance.spec.ts` runs a cold initial landing navigation against the production fixture build. It installs a buffered layout shift observer before navigation, waits for the visible heading, font readiness, two animation frames, and network idle, then records successful public Next static script, stylesheet, and font responses. Asset read failures fail the measurement. Byte counts use decoded [Playwright response bodies](https://playwright.dev/docs/api/class-response#response-body), not compressed transfer size or the entire repository's generated assets.

The score uses the largest layout shift session, with gaps below one second and a session duration below five seconds. Recent input shifts are excluded by the observer. This follows the [LayoutShift API](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift) and [Google's session rules](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts). Seven unit cases cover stable pages, nearby shifts, exact time boundaries, the first scoring shift, separate sessions, and zero value entries. The helper is test infrastructure, with no application analytics or runtime instrumentation added.

The browser check requires the measured profile and device scale, loaded fonts, and no horizontal overflow. It limits CSS and client JavaScript growth to ten percent, prevents additional font requests or new font content, and permits no more than 0.02 additional initial observed CLS. Font identity uses SHA256 of response bytes so generated filenames are not a portability requirement. The measurement writes a report attachment; it never overwrites the canonical baseline. Intentional future design changes require a reviewed new measurement.

The fixture lives inside the web workspace, so its inputs participate in normal workspace hashing. The standard fixture configuration includes this test. CI also runs the two performance profiles in production mode after the existing smoke test; remote execution remains unobserved.

## Verification and limits

- Initial baseline capture passes both profiles. Three subsequent runs per profile pass with identical metrics.
- The complete fixture suite passes all 74 desktop/mobile cases and closes its owned servers. The final font hash comparison also passes both targeted profiles.
- Root unit suites pass 806 cases across five workspaces, including 98 web cases. The sandbox initially blocked the existing Vitest/esbuild configuration loader; the run with process access passes all fifteen UI cases.
- Root lint, formatting, and type checks pass. Final web lint and type checks pass after measurement cleanup.
- A normal root production build passes and replaces the fixture build output.

No shared primitive, application style, route, provider, template, database schema, or package dependency changed. The measurement is an initial loading laboratory sample on local fixtures. It is not compressed network cost, field Core Web Vitals, a full visit with scrolling and interactions, Firefox or WebKit evidence, physical mobile device evidence, or a deployment result.

The Button/Card ownership review identified incompatible contracts: the package Button preserves loading and external status behavior, while the application copy supports Slot composition and compact variants; package Card is semantic article/section, while the application copy defaults to a div. Both remain live. The next migration must preserve the package public contracts, move shared implementation ownership into `packages/ui`, handle navigation through a real Link composition, preserve caller class precedence, and verify styles and accessibility. The accepted Tailwind rollout and the overall restructuring remain incomplete.
