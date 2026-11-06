# WebGL theme refresh

Restoring the dark theme could leave a pale rectangle behind the envelope in an already open development tab. CSS refreshed, but the canvas retained the GPU program compiled from the earlier light shader. A fresh navigation correctly loaded the dark shader.

The canvas now imports renderer factories directly and includes the selected factory in its effect dependencies. Shader edits therefore clean up the active renderer and create its replacement. GPU initialization still waits for visibility and enabled motion. Context recovery, pointer response, pixel budgets, and finite playback remain intact. Shader code is included with the canvas module instead of loading through a separate dynamic import.

Regression verification used a harmless comment marker in the silk fragment source while a development page stayed open. With the original code, the active GPU shader source still lacked the marker after live reload. Direct imports alone also failed. With the selected factory in effect dependencies, the active shader acquired the marker without navigation. Removing the marker updated the GPU source again, and the final program contained the dark berry palette. Temporary probes were removed. This checks the running GPU program rather than only the source file or stylesheet.

All 22 selected production browser checks passed across desktop and mobile, covering WebGL rendering, card effects, guide selection, idle settlement, context loss and restoration, reduced motion, absent WebGL, and the unchanged landing performance budgets. The production build and TypeScript compilation passed. Validation used installed Node 26; supported Node 24 CI remains pending.
