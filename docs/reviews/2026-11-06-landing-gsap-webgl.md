# Interactive landing with GSAP and WebGL

Historical verification of the GSAP and WebGL integration. The subsequent material artwork revision removes the sample opening controls and their state. See `2026-11-06-letter-artwork-refinement.md` for the current artwork verification.

## Delivered

Replaced the previous pale landing background with deep berry and rose. Removed the positive ivory background requirement from the design guide, landing context, and spec 0012. Shared default color tokens are explicitly documented as adjustable defaults rather than a restriction on future page design. The earlier verification report is marked historical and superseded.

The sample letter now opens and closes through a reversible GSAP timeline. Its seal, envelope, and letter move in sequence; the opened paper sits above the envelope so its complete message can be read. Rapid repeated activation reverses the same timeline. State and accessible labels update immediately and never depend on animation completion. Fine pointers add restrained depth using reusable GSAP tweens.

A scoped React motion shell animates hero copy and section entrances with GSAP and ScrollTrigger. It receives the server rendered section content as children. The existing catalog reads, preview mounting, creation links, native FAQ, legal dialogs, and authentication behavior remain connected.

A native WebGL shader renders moving rose silk behind the letter and responds to pointer position. The shader implementation loads when the scene is visible and animation is enabled. It uses no new package, image asset, font, or third party service. Rendering is capped at 30 frames per second, pixel density 1.5, and approximately 1.2 million drawing pixels. GPU objects, observers, animation frames, and native event listeners are released during cleanup. The WebGL lifecycle follows [Khronos context loss guidance](https://wikis.khronos.org/webgl/HandlingContextLost); GSAP uses its scoped [React lifecycle](https://gsap.com/resources/React/) and cleanup support.

The visible motion control pauses decorative motion. Reduced motion uses immediate letter states and skips WebGL initialization. Graphics pause offscreen and in hidden tabs. Unavailable or lost WebGL falls back to static artwork without blocking the sample, catalog, or page content. Restoring the GPU context recreates the renderer while retaining the letter state. Without JavaScript, all server content and preview navigation remain available, and the sample's interactive control is hidden.

## Verification

- Production build and TypeScript compilation passed through the isolated fixture runner.
- Production Chromium desktop and mobile browser run: 39 passed, one expected hover case skipped on the touch profile.
- Coverage includes 320 through 1440 pixel reflow, landscape, keyboard navigation, FAQ, preview focus containment, no JavaScript navigation, forced colors, reduced motion, rapid letter reversal, motion controls, offscreen rendering suspension, unavailable WebGL, and context loss and restoration.
- The final run also verifies that the opened message is above the envelope and can be hit tested without obstruction.
- Axe found no violations in the checked rendered landing and expanded FAQ states at 375 and 1440 pixels.
- Existing landing, empty, error, and loading performance gates passed on both profiles. No historical baseline was modified. Final ordinary landing measurements: 255,888 decoded CSS bytes, 1,072,625 decoded JavaScript bytes, and ten existing font requests on each profile. CLS was 0.0113 or less on desktop and zero on mobile, within the existing 0.02 allowance.
- Web unit tests: 128 passed.
- Contrast measurements: muted text on the raised berry surface 7.07:1, dark action text on rose 10.29:1, and sample label text on pink paper 6.17:1.
- Desktop and phone screenshots were inspected, including the opened sample. The existing legal dialog was also checked for its independent readable colors and Escape dismissal.

Browser tests use isolated fixtures and do not prove real OAuth or database behavior. The installed execution runtime is Node 26.13.0; the project's supported Node 24 CI gate remains to run. This is implementation verification, not an independent code review.
