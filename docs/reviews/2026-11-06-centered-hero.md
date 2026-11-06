# Centered hero and simplified header

The previous hero combined a 41-rem minimum content height with another 9.5 rem of vertical padding. Below the header, that pushed the envelope and caption outside the supplied 730-pixel-high desktop viewport.

The hero now uses border-box sizing, equal responsive vertical padding, and a minimum height equal to the viewport space below the header. Its columns center vertically, and the paper scene scales with desktop viewport height within a bounded width. Phone layouts center the copy and artwork in a single column and grow naturally so content remains readable. Short landscape screens may scroll rather than clipping content.

The requested header pause control, its state, and its unused styles are removed. The WebGL silk has a four-second visible entrance, then stops its animation frame loop. Pointer input wakes a response that settles again. Reduced motion disables decorative animation; offscreen suspension, hidden-tab handling, GPU cleanup, and context-loss recovery remain in place. Current design guidance and the landing spec record the user's revised direction.

All 24 targeted production-browser cases passed across desktop and mobile projects. Coverage includes nine viewport size pairs from 320-pixel phones through 1920-pixel desktops, centered composition and standard desktop viewport fit, eleven paper alignment widths, message visibility, reduced motion, forced colors, automated accessibility, renderer settlement and pointer wakeup, WebGL fallbacks, context recovery, and the unchanged landing performance budget. Desktop and phone viewport screenshots were inspected. Production build and TypeScript compilation passed. Validation used installed Node 26; supported Node 24 CI remains pending.
