# Private-beta launch checklist (draft)

This checklist is evidence-oriented and must be completed against staging
before public launch. A checked implementation item is not a substitute for a
reviewer sign-off. Policy documents in `docs/policies/` are drafts until legal
and child-safety review is recorded.

## Security and privacy

- [ ] Administrator role enforcement and bootstrap controls verified.
- [ ] Creator ownership isolation and foreign-resource not-found behavior
      verified.
- [ ] Privacy headers (`no-store`, no-index) verified for unavailable, report,
      administration, and private response surfaces.
- [ ] Redis/Valkey rate limits and fail-closed protected writes verified.
- [ ] CSRF and trusted-origin checks verified for every cookie-authenticated
      mutation.
- [ ] Disabled-user session revocation and public-page hiding verified.
- [ ] Sentry and structured logs contain only allowlisted operational fields.
- [ ] No analytics or monitoring event contains letter text, visitor messages,
      report text, credentials, cookies, tokens, raw identity, or media keys.
- [ ] Retention configuration, purge alerts, and failure recovery verified.

## Accessibility and responsive behavior

- [ ] Keyboard access and visible focus verified for report and admin flows.
- [ ] Labels, validation messages, loading, unavailable, retry, and success
      states announced accessibly.
- [ ] Confirmation dialogs trap focus, close with Escape, and restore focus.
- [ ] Touch targets are at least 44 CSS pixels on mobile.
- [ ] Desktop and mobile layouts have no horizontal overflow.
- [ ] Reduced-motion behavior skips nonessential animation and remains usable.

## Recovery and policy

- [ ] Isolated Neon restore drill passed with RPO ≤ 5 minutes and RTO ≤ 60
      minutes.
- [ ] Drill evidence is recorded under
      `docs/runbooks/evidence/launch-hardening/` with synthetic data only.
- [ ] Privacy, acceptable-use, and copyright policies are published after legal
      review.
- [ ] Child-safety review and escalation contact are recorded.
- [ ] API owner approval is recorded.
- [ ] Security or privacy reviewer approval is recorded.
