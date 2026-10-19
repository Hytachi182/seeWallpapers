# Night Train Viaduct

A night train crosses a tall stone viaduct above a moonlit river, in **Cinematic**. The steam locomotive leads, with a pilot, a smokebox, a boiler with brass bands, a chimney, a dome and a cab. The fireman's silhouette stands in the firebox glow, which also flickers between the wheels. The driving wheels turn at the speed of the train, their side rod and piston rod follow the crank pins, and the tender carries a heap of coal. The headlamp throws a beam along the rails. Each carriage has its own livery, lit windows that flicker slightly, passengers in silhouette who sway with the train, and bogies with turning wheels. The carriage light spills onto the cornice below and its reflection shimmers on the river.

The train runs from left to right on a regular cycle, with a few quiet seconds on the empty viaduct between passes. The plume from the chimney stays where it was puffed, rising, swelling and fading behind the train. A block signal at the far end shows green, turns red while the train is passing, then returns to green.

The viaduct's arches have voussoirs, staggered stone courses, cutwaters at the waterline and a cornice with an iron railing. Through the arches you can see a forested slope in the mist, and the viaduct is reflected in the river. A mountain village with a church spire sits on the hillside above the line, its windows lighting and dimming one by one. Stars twinkle, clouds drift past the moon, and the moon's reflection glitters on the river, framed by dark pines in the foreground.

Settings control the following:

- animation speed
- the number of carriages (3–10)
- the time of night, from night to blue hour (the sky warms at the horizon and the stars fade)
- the steam plume
- snowfall, which also covers the peaks, roofs, trees, carriage roofs and cornice in snow
- the village lights

Everything is drawn in code: no images, fonts or network requests. The sky, mountains, village, viaduct, river and foreground are drawn to off-screen layers, which are rebuilt only when the size, time of night or snow changes. Each frame redraws only the stars, clouds, river shimmer, train, steam, signal and snowflakes.

`index.html?preview=12` generates a deterministic still, with the train on the viaduct. Portrait screens lower the horizon and shrink the foreground trees. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-night-train-viaduct.mjs` verifies deterministic previews and core motion with steam, snow and village lights disabled. It also checks settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
