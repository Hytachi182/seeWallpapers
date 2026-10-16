# Bioluminescent Tide

A moonless beach where the surf glows, in **Nature**. A new wave rolls in from the horizon every few seconds. As each wave approaches it grows taller and wavier, and its crest begins to shimmer. It does not break all at once: each stretch of the crest has its own breaking moment, so the light peels along the wave. Breaking water flares in the glow colour, with a fading foam tail and twinkling sparks. The whitewater runs up the wet sand to a different line each time, slows, then drains back and leaves glittering points that fade on the sand.

A night walker crosses the wet sand. Each footstep flashes, sends out a small ripple and fades over several seconds, leaving a trail of glowing prints. Jellyfish drift and pulse beneath the swell, trailing tentacles. Spray glows against the foot of a rocky headland, beside two sea stacks. A fishing boat bobs on the horizon, and its lantern's reflection wavers on the water. The Milky Way, with dust lanes and dense star fields, arches over the sea, and a few stars twinkle.

Settings control the following:

- animation speed
- the intensity of the bioluminescence
- the glow colour, which blends continuously from cyan to green to violet
- the night walker and their footprints
- the jellyfish
- the Milky Way

Everything is drawn in code: no images, fonts or network requests. The sky, Milky Way, sea, sand and headland are drawn to off-screen layers. The waves are computed from time alone, so any moment can be drawn directly.

`index.html?preview=12` generates a deterministic still; the catalogue preview uses `?preview=20.5`, as a wave breaks. Portrait screens raise the horizon and move the headland and sea stacks. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-bioluminescent-tide.mjs` verifies deterministic previews and core motion with the walker, jellyfish and Milky Way disabled. It also checks settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
