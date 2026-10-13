# Review, feat/nest-cli-api-startup, 2026-10-11

**Reviewed by**: GPT-5.6 Terra (author on GPT-6)
**Scope**: 13 files, feat/nest-cli-api-startup vs feat/milestone-09-accessibility-measured-ui
**Verdict**: Approve

## Summary
This change moves API startup and OpenAPI generation through the Nest CLI, extends the CI allowance for the browser quality gate, and makes fixture build output ignored. It also stabilizes WebKit-oriented browser assertions and delays YouTube provider initialization until its disclosure is visibly presented, while keeping the opening sequence and reduced-motion path coherent. The actual PR range is internally consistent with the template, accessibility, and delivery rules; the CI `quality` check passed. Scope row 20 is already marked “Review it”, so it remains unchanged.

## Strengths
- The YouTube regression test observes script insertion at the document boundary, which verifies the disclosure is present at the actual provider-request point rather than after Playwright receives the request.
- Nest CLI startup compiles the same API entry paths used by the Playwright server and OpenAPI generation, while the adjusted fixtures retain their behavioral assertions across browser engine differences.

## Test coverage
Configured coverage is appropriate for the changed behavior: the focused Playwright test covers visible disclosure before YouTube preload and hidden-frame accessibility, and the existing recovery, image, auth, and landing journeys were made more deterministic without removing their meaningful assertions. The reported passing CI `quality` gate also exercises the updated API startup path through the browser smoke suite and runs the generated OpenAPI step.
