# Drifting Jellyfish

Jellyfish of every size drifting across deep blue water, in **Nature**. Each one pulses at its own rhythm: the bell narrows and lengthens as it contracts, the body rises a little with every beat and sinks back while it relaxes. Bells are translucent with a bright rim, ruffled edge beads, radial canals and glowing organs; frilly arms and long, thin tentacles trail behind and ripple with the beat and the direction of travel. Small distant jellyfish glow in the haze while large ones pass slowly in front. They cross the whole screen at different speeds and wrap around, so the scene keeps changing without ever repeating exactly.

Marine snow sinks through the water and slow shafts of light sway in from above.

Settings control the following:

- animation speed
- the number of jellyfish (3 to 18; the first N of a fixed set are shown, so the scene stays stable when the value changes)
- glow around the bells and organs
- tint colour, mixed into the water and every jellyfish
- marine snow
- light shafts

Everything is drawn in code: no images, fonts or network requests. The water is drawn to an off-screen layer, rebuilt only when the size or the tint changes. Each frame draws only the light shafts, snow and jellyfish, with additive blending.

`index.html?preview=20` generates a deterministic still. Portrait screens scale the jellyfish to the height of the screen. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-drifting-jellyfish.mjs` verifies deterministic previews, core motion with marine snow and light shafts disabled, the jellyfish count and tint, settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
