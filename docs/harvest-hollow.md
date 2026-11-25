# Harvest Hollow

A small pixel-art farm that runs itself, in **Games**. A farmer walks the field on a tile grid, tills the soil, plants seeds, waters them with a can, harvests the ripe crops, carries them to the shipping crate and watches the coin count climb with a little "+N" popup. The field holds 24 plots, and carrots, sunflowers and pumpkins are planted in turn.

The farmer follows a simple task queue: deliver a full load, harvest what is ripe, water planted soil that has dried out (watered soil stays wet for two days), plant tilled soil, then till fresh ground. Each action has its own animation: the hoe swings and soil flakes fly, seeds drop onto the soil, the can tips with droplets falling on the plot, and a ripe crop pops up with a small bounce before it is carried over the farmer's head. Crops grow in four visible stages (sprout, leafy, flowering, ripe). They only grow quickly while the soil is wet, so the farmer has to water them again on the following day.

Day and night run on a cycle. The sky dims to a blue tint, the farmhouse windows glow warm, fireflies drift over the field and the farmer walks home to sleep, with zZz floating above the roof. In the morning he comes out of the door and goes back to work. Chickens wander the yard below the field all day.

Seasons rotate every three in-game days: spring green, summer with darker grass and trees, autumn with orange trees and falling leaves, and winter with snow on the ground and roof and an icy pond. Nothing is planted in winter, so the farmer tidies the path and fishes at the pond instead, and a catch adds coins.

A small HUD in the top-left corner shows the day number, the season, the time of day and the coin total.

Settings control the following:

- farm speed (zero freezes the scene)
- seconds per in-game day (30 to 240)
- whether seasons rotate, and the starting season (spring, summer, autumn or winter)
- wandering chickens
- the HUD

Everything is drawn in code: no images, fonts or network requests. The simulation uses a fixed time step and a seeded random generator, so `index.html?preview=670` produces the same frame every time. It shows day 8 in autumn, mid-morning, with the farmer working a field full of crops at every stage. Preview times are capped at 3600 seconds. The static layer (ground, pond, fences, house, crate and trees) is built off-screen and rebuilt only when the size or season changes. The render buffer is bounded to 1920 × 1080.

Host pause and resume, visibility changes, frame-rate callbacks and reduced motion (a still frame) are all supported. Portrait screens scale the farm to the width of the screen and fill the rest with meadow.

`build/check-harvest-hollow.mjs` verifies deterministic previews, that time, the HUD, chickens, seasons and day length each change the frame, invalid settings, reduced motion, zero speed, pause, 4K bounding, portrait layout without horizontal overflow, and offline loading.
