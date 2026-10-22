# Lantern Fairground

A night fair on the shore of a pond, in **Lifestyle**. A great Ferris wheel turns slowly above the fair: sixteen lit gondolas with passengers swing a little as they ride, the rim lights chase around and the spoke lights cycle through three patterns, a pulse running out from the hub, a beam sweeping around the wheel and a random sparkle. Beside it a carousel spins under a red and cream striped roof, its horses galloping up and down on golden poles as they come round to the front, in front of a mirrored drum and a ring of chasing bulbs. A big top with a glowing entrance and a row of game stalls with scalloped awnings and prize shelves line the lawn, strings of coloured bulbs ripple between the poles, and visitors stroll in both directions, some holding balloons.

Sky lanterns rise from the fair, drift with the wind, flicker and shrink into the stars. Fireworks launch from behind the rides: peonies, double rings and golden willows that burst, fall under gravity and crackle as they fade, lighting the sky around them. The whole fair is mirrored in the pond, where the reflection ripples slowly and coloured glints shimmer on the water, framed by swaying reeds. A crescent moon, distant hills and village windows sit behind the warm glow of the fair.

Settings control the following:

- animation speed
- Ferris wheel speed (zero stops the wheel while the rest of the fair keeps moving)
- fireworks frequency (zero turns them off)
- the number of sky lanterns (0 to 30)
- bulb colour, mixed into every bulb, the sky glow and the lit windows
- pond reflection

Everything is drawn in code: no images, fonts or network requests. The sky, moon, hills and lawn are drawn to an off-screen layer, rebuilt only when the size or the bulb colour changes. The reflection copies the rendered fair into the pond in thin strips, each offset by a slow ripple.

`index.html?preview=26.7` generates a deterministic still with two firework bursts. Portrait screens centre the Ferris wheel. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-lantern-fairground.mjs` verifies deterministic previews, core motion with fireworks, lanterns and reflection disabled, the wheel speed, fireworks, lantern count and bulb colour, settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
