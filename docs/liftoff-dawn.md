# Liftoff Dawn

A rocket launch on a seaside pad at dawn, in **Space**. A mission clock counts down at the corner of the screen, floodlights glow on the pad and a tower with swing arms stands beside the vehicle. At ignition the arms retract, the engines light and a billow of smoke rolls out along the ground, lit orange from below. The rocket then climbs on a long exhaust trail while the camera follows it up through the clouds, the sky darkens into space with stars and the curve of the Earth below, the first stage separates and tumbles away, and the vehicle leaves the top of the frame. The scene fades out and the next launch fades in, every 46 seconds.

Settings control the following:

- animation speed
- night to day (floodlights and stars at night, a bright sky at midday)
- clouds
- stars
- the mission clock (time, altitude and velocity)

Everything is drawn in code: no images, fonts or network requests. The rocket, its altitude, drift and tilt, the smoke and the trail are pure functions of time, so a still frame is always reproducible.

`index.html?preview=21` generates a deterministic still. Portrait screens scale the scene to the height of the screen. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-liftoff-dawn.mjs` verifies deterministic previews, the motion of the rocket with clouds, stars and the clock disabled, the fade between launches, settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
