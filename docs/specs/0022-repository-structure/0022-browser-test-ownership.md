# Browser journey test ownership

Date: 2026-10-05

**Status**: Accepted

## Contract

Separate the current public-secret-letter browser file into cohesive visitor identity, creator media, creator questions, creator sharing, Choose Your Heart, and public Secret Letter owners. Keep the original public-secret-letter path for the actual public viewing and no script suites. Share existing owner record and editor helper builders through one file under e2e/fixtures. Preserve helper bodies, every test body, suite title, nested suite, environment gate, skip, and parameter behavior.

Within the existing broad creator suite, retain its historical describe title in both new files so test title paths remain recognizable. File ownership supplies the clearer distinction between media and questions. Keep the current default two browser projects and discovery behavior. Do not add these legacy live suites to the routine fixture or cross engine UI allowlists without a separate behavior verification that supplies their required authentication and published fixtures.

## Verification

Record the original default Playwright discovery before the split, without starting servers. Compare the full discovered test title and project multiset after moving files, ignoring only filenames. Compare original syntax tree test bodies and helper bodies against the resulting owners. Run lint, formatting, type checks, and web units. Execute the extracted pure visitor identity cases without starting API or web servers. Request the existing GPT-6 Luna reviewer to check grouping, helper closure, exact preservation, environment gates, and discovery.

Published page, upload, unlock, and private submission journeys require deliberate isolated fixtures and are not certified by a discovery check. This milestone changes test ownership only and makes no product, template registration, API, provider, or live data change. The broader original requirements and acceptance audit remain open.
