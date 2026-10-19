# Pocket Quest

A handheld console that plays a monster-collecting adventure all by itself, in **Games**. The console sits in the middle of the screen with its four-shade green LCD, a d-pad and buttons that light up as the game "presses" them. On the screen, a hero steps out of a village house, follows the path and wades into tall grass until a wild creature appears. The screen flashes and wipes into a turn-based battle: the creatures slide in, a typed message announces the encounter, the menu cursor picks FIGHT, then an attack, with flames or lightning, blinking sprites, shaking, draining health bars and the turn of the opponent. The first creature faints and the hero gains experience. On the way to the next patch of grass a second creature appears and this time the hero throws a ball: it flies in an arc, the creature is drawn in, the ball wobbles three times and sparkles. The hero then walks home through the door, the screen closes and the game starts again. A loop lasts about 75 seconds.

Settings control the following:

- game speed
- screen palette (0 classic green, 1 grey, 2 blue, 3 amber)
- the console around the screen (off shows only the screen)
- a pixel grid over the screen (scanlines on small screens)
- a glow of the screen colour around the console

All of it is drawn in code, with no images, fonts or network requests: a 5 × 7 pixel font, tiles for grass, tall grass, trees, water, paths, fences, houses and flowers, a hero sprite with four directions, creatures generated from a seed, and the console body. The game renders into a 160 × 144 four-shade framebuffer, exactly like the original screen, and is scaled with nearest-neighbour sampling. All creature names, art and the game itself are original.

The game is a pure function of time, so `index.html?preview=16.8` generates a deterministic still of any moment. Portrait screens scale the console to fit. Host pause/resume, visibility and frame-rate callbacks are supported. A speed of zero freezes the scene; the reduced-motion preference shows a still frame. The render buffer is bounded to 1920 × 1080.

`build/check-pocket-quest.mjs` verifies twelve distinct moments of the game (walk, alert, flash, appearance, menu, attack, faint, catch and exit), deterministic previews, the seamless loop, settings including invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout and offline loading. `build/capture-template-previews.mjs` checks real Edge rendering and that each setting has a visible effect.
