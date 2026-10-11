# Review, editor-unused-styles, 2026-10-05

**Reviewed by**: GPT-6 Luna (author on GPT-6)
**Scope**: 3 files, uncommitted
**Verdict**: Approve

## Summary
The stylesheet cleanup removes 59 complete rules whose local classes are absent from all eight importing owners. I found no retained-class intersection or indication that a stylesheet value escapes the statically inspected access patterns. The cleanup contract and audit artifact describe the owners and cascade comparison clearly, and the recorded PostCSS comparison supports that the retained rules and ordering are unchanged.

## Strengths
- All eight actual stylesheet importers match the recorded owner list; the report records 86 used classes, 59 removed rules, and zero style-object escapes.
- Removed selectors have no overlap with the used-class inventory. The independent retained-cascade comparison makes preservation of active styling directly reviewable.
- The change stays limited to complete unused rules and records source hashes, removed selectors, and retained rule evidence.

## Test coverage
The author reports 121 passing web unit tests and a passing production fixture build. The 180-case cross-engine browser run was still in progress during this review, so I have not counted it as completed verification. The temporary Playwright runner and unrelated lockfile change were excluded from review scope as directed.

## Addendum: audio motion check retry, 2026-10-05

**Scope**: `apps/web/e2e/audio-player-motion-check.ts` only
**Verdict for this addendum**: Approve; the initial minor finding is resolved in the follow-up revision

The new `resume()` sample runs before-angle capture, `playing` dispatch, two animation frames, and after-angle capture inside one `page.evaluate`, so it removes Playwright protocol round-trip time from the elapsed measurement. Given the eight-second rotation, the upper bound of elapsed time × 45 degrees per second plus three degrees is a sound way to avoid treating frame scheduling latency as an angle reset. Existing paused, buffering, ended, and subsequent-motion checks remain in place.

### Minor: reset near zero can pass the continuity bound, `apps/web/e2e/audio-player-motion-check.ts:38`
**Problem**: The forward modulo advance treats a reset from a small negative angle (for example, -1 degree) to zero as roughly one degree of forward motion. That is within the allowance, so this check does not always detect a reset; the later assertion only proves that motion resumes relative to the pre-resume angle.
**Why it matters**: A regression that restarts the disc animation near its zero-angle point can pass this resume check even though the test intends to detect angle resets.
**Suggested fix**: Compare the measured angular change against the expected forward change for the measured elapsed time with a tolerance, or otherwise ensure the resume sample begins sufficiently far from the reset angle while retaining the in-browser timing measurement.

The focused rerun of the affected checks completed with all six cases passing (21.5 seconds). This is the targeted rerun; no second full 180-case run was reported.


### Resolution: resume sample excludes reset angles
The updated helper now waits for the initial spin and paused checkpoint to pass 30 degrees, then each resume sample requires its starting angle to be more than 30 degrees from zero and its elapsed-time allowance to be smaller than that distance. If the angle resets to zero, the forward modulo advance is at least the distance from zero, so it cannot satisfy the strict advance bound. A sample too close to zero or too slow to measure fails as unobservable instead of passing. The before/playing/two-frame/after sequence remains within one browser evaluation, so protocol latency is excluded. This resolves the prior near-zero reset finding.

The final six-case safeguard run passed in 23.4 seconds. It is a targeted rerun; no second full 180-case run was reported.
