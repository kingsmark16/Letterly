# Letter proportions and tilted alignment

The previous alignment check compared viewport bounding box centers. That did not prove that paper and envelope shared a centerline when they rotated independently at different vertical positions. The large percentage minimum height also left excessive blank paper below the message.

The paper and envelope now sit in one rotated stationery frame. Equal side insets center both within that frame. Paper height follows its text and padding, with its lower edge anchored at the envelope opening. The entrance animates translation only, preserving the shared tilt. The hero layout is unchanged.

At the wide desktop sample, paper height decreased from roughly 417 pixels to 285 pixels. The mobile rules retain enough space for the complete message. The updated regression measures alignment along the rotated frame's axis and bounds paper height relative to envelope width, rather than comparing screen horizontal centers.

Production build and TypeScript compilation passed. Ten targeted desktop and mobile Chromium browser cases passed, covering eleven alignment widths from 320 through 1920 pixels, message readability, responsive layout, automated accessibility, and the unchanged landing performance budget. Desktop and phone screenshots were inspected. Tests use isolated fixtures and the installed Node 26 runtime; supported Node 24 CI remains to run.
