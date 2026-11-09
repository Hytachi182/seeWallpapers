# Balloon Valley Sunrise

Hot-air balloons drifting over a mountain valley at sunrise, in **Nature**. The balloons fly at every distance: small, hazy ones near the far mountains and large ones close by, some passing behind the nearer ridges. Each envelope is made of curved gores in two or three colours, some with a belt, and turns slowly as it rides the wind. The sun lights one side while the other stays in shade. Every few seconds a pilot fires the burner in short bursts: the flame flickers above the basket, the envelope glows from inside and the balloon climbs before slowly sinking back.

Five ridges fade from crisp silhouettes in front to pale mountains in the haze, their crests catching the low sun. Mist drifts along each valley, soft clouds glide across a sky that runs from violet to gold, sun rays fan out behind the balloons, and now and then a flock of birds flaps across. Trees on the nearest hill sway a little.

Settings control the following:

- animation speed
- the number of balloons (3 to 16; the first N of a fixed set are shown, so the scene stays stable when the value changes)
- time of day, from pre-dawn with fading stars to early morning
- valley mist
- wind, which carries the balloons, clouds and mist (zero leaves the balloons hovering in place)
- sun rays

Everything is drawn in code: no images, fonts or network requests. The sky, sun and stars are drawn to an off-screen layer, rebuilt only when the size or the time of day changes. Mist and clouds are drawn from one soft sprite each, and balloons are drawn between the ridges according to their distance.

`index.html?preview=31` generates a deterministic still with a burner alight. Portrait screens scale the scene to the height of the screen. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-balloon-valley-sunrise.mjs` verifies deterministic previews, core motion with mist, wind and sun rays disabled, the balloon count, time of day and wind, settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
