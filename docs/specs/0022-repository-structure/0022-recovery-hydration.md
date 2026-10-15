# Recovery form hydration readiness

Date: 2026-10-05

**Status**: Superseded by [spec 0024](../0024-oauth-only-authentication.md)

The recovery and verification-resend forms, routes, and behavior described below were removed across all environments. This historical verification contract no longer applies to the current OAuth-only authentication flow.

## Contract

The recovery email form must not accept input or submission before its React Hook Form subscriptions are ready. Use the existing form's `formState.isReady` as the readiness source. Keep the email field and submit control disabled until ready, preserving the submitting disable state. Keep the current validation schemas, normalized email, safe completion copy, API calls, and template/authentication stylesheet values.

The delayed script probe reproduced the existing problem: an email entered in the server rendered input was present before hydration and became empty after scripts loaded. This fix prevents the early edit rather than allowing React Hook Form initialization to overwrite it. It adds no provider, new form state owner, persistent draft, or credential entry activation.

## Verification

Hold local JavaScript chunks while rendering password reset request and verification resend pages. Verify the email and submit control remain disabled, release chunks, verify they become usable, then enter an email and submit through an intercepted provider route. Assert the normalized payload and generic completion. Run the existing recovery and authentication journeys through the production fixture build, preserving keyboard and browser coverage. Record fixture limits and run the root commit gates.

The same run also exposed outdated authentication test selectors and floating point geometry comparisons. Update the tests to use the current catalog heading, mobile workspace drawer, and account menu. Retain the 44 pixel target expectation with only a small geometry rounding tolerance, rather than changing application dimensions. These test corrections change no product behavior.
