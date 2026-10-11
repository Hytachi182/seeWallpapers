# Snowglow Village

A snowy Christmas village at night in **Lifestyle**. A towering tree stands in the square. Its lights spiral around the trunk, and only the side facing the viewer is drawn, so the spiral reads as round. Ornaments catch the light, and a gold star pulses with slowly turning rays. A toy train circles the tree on an elliptical track: each locomotive and wagon is a small box projected from a circular ground plan, so it narrows and shows its ends at the sides and passes behind the trunk at the back. The locomotive puffs smoke and lights its headlamp, and one wagon carries a present.

Around the square, gabled houses and a stone church glow with flickering fireplace windows, wreaths and stained glass. Roof lights chase along the eaves, chimneys release drifting smoke, street lamps cast warm pools on the snow, and a snowman's scarf flutters in the breeze. Snowy hills with pines and distant cottages fill the background under a full moon and twinkling stars. Every 42 seconds, Santa's sleigh and four reindeer, with a red-nosed leader, gallop across the moon, leaving a golden sparkle trail. Three depths of snow fall over the scene, and the snow on the ground glitters.

Settings control animation speed, snowfall density, multicolor or warm-white lights, and toggles for the train, the sleigh and chimney smoke. Everything is drawn in code: no images, fonts or network requests.

Portrait screens keep the tree, train and sleigh centred and leave out the snowman. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`index.html?preview=22` generates a deterministic still with the sleigh in flight. `build/check-snowglow-village.mjs` verifies core motion with optional effects disabled, settings, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering.
