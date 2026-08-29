# 0016. Romantic glass Secret Letter presentation

**Date**: 2026-08-29
**Status**: Accepted

## Summary

The public and preview Secret Letter renderer will replace the restrained paper
presentation from spec 0013 with a high-end romantic studio composition. A warm
pink and cream gradient, translucent light forms, glossy hearts, ribbons, and a
floating white letter stage create depth without competing with the message.
The response journey becomes a centered glass quiz labeled `choose`, with one
question visible at a time and crimson-to-magenta pill choices.

This is a visual and motion enhancement only. Existing content contracts,
privacy rules, password protection, publishing behavior, and response
submission semantics are unchanged.

## Requirements

- Public and creator preview routes continue to use the same named
  `SecretLetterRenderer` and existing render model.
- Password-protected content remains absent from the locked render. Unlocking
  continues through the existing envelope form and automatically opens the
  letter only after successful verification.
- Recipient name and message remain server-rendered React text nodes and are
  readable when JavaScript or GSAP fails. No raw creator HTML is rendered.
- The opening remains visitor-controlled unless the existing auto-open path is
  active. Open, replay, skip, reduced-motion, focus transfer, and accessible
  labels remain functional.
- The studio background may use warm gradients, translucent surfaces,
  glassmorphic shapes, abstract ribbons, glossy CSS hearts, ambient particles,
  metallic highlights, and edge glows. Decorative elements remain hidden from
  assistive technology and never intercept input.
- Rich motion is occasional: the envelope reveal, ambient depth, and choice
  feedback. Reading, text entry, and submitted states remain stable.
- Long main messages are divided into deterministic, creator-content-only
  pages that fit the centered message card. The active page may use a slow
  character reveal with an immediate completion control; the complete message
  remains server rendered and readable without JavaScript.
- GSAP work is scoped to the renderer root, uses transforms and opacity, and is
  reverted on unmount. Pointer depth uses bounded GSAP setters rather than
  synchronous layout-affecting style writes on every pointer event.
- Reduced motion removes particles, continuous drift, pointer depth, and
  spatial transitions while keeping every state immediately understandable.
- The response experience shows one sequential question at a time. It is
  presented inside a floating glass stage with a visible `choose` label;
  choice, text, final-message, error, and success states retain existing
  behavior and accessible names.
- Images keep safe paths, captions, lazy loading, responsive sizing, and the
  current unavailable-image fallback. When several images exist, the gallery
  uses horizontal scroll snapping, keeps two primary cards visible at every
  supported width, and visually recedes neighboring cards with transform and
  opacity depth.
- The composition works at 390, 768, 1024, and 1440 px, maintains 44 px targets,
  visible focus treatment, WCAG AA text contrast, and readable line lengths.
- No API, database, environment, persistence, template model, or public
  metadata changes are introduced.

## Decision

Use the installed GSAP React integration for a scoped timeline and restrained
pointer parallax. Use CSS for static glass materials and low-frequency ambient
loops. The visual language is intentionally expressive but remains a
progressive enhancement over a semantic, readable document.

Spec 0013 remains historical context for the renderer boundary and behavioral
requirements; this spec supersedes its restrictions on gradients,
glassmorphism, generic hearts, particles, and the paper-only visual direction.
