# Comet Pinball

A neon space pinball table that plays itself, in **Games**. The table is drawn in the middle of the screen over a starfield and nebula. A ball is launched from the plunger lane on the right, runs over a curved orbit lane and a row of rollover lamps at the top, and then bounces between three round pop bumpers, two slingshots and the flippers. Drop targets run down the right side.

The ball follows real 2D physics: gravity pulls it down the table, walls and flippers are circle-against-segment collisions, bumpers and balls are circle-against-circle, and each step is split into substeps so the ball never tunnels through a wall. The flippers swing at a limited angular speed, and the ball picks up their surface velocity when it is struck.

The AI watches the ball and flicks a flipper when it is falling towards that side or resting on it. Its timing is slightly late and one swing in ten is missed, so the ball is sometimes lost. Kicks from bumpers and slingshots carry a small seeded deflection, and after ten kicks without the ball returning to the flippers they go passive, so the ball can never settle into an endless loop. A ball wedged anywhere for two seconds gets a table NUDGE. Three balls make a game. Clearing all four drop targets lights multiball and adds up to two extra balls, and the bank then resets. When the last ball drains, the table shows GAME OVER for a few seconds and starts again.

Settings control the following:

- game speed (zero freezes the table)
- neon accent colour
- ball trail
- multiball when the drop targets are cleared
- score and ball display

Everything is drawn in code: no images, fonts or network requests. The simulation is deterministic. A seeded generator drives the AI and the sparks, and the state only advances in fixed steps, so `index.html?preview=20` gives the same still every time. The preview fast-forwards from the start of the game to that second. Static table art is pre-rendered once per size and colour, and the render buffer is bounded to 1920 × 1080. The table scales to fit both landscape and portrait screens. Host pause/resume, visibility and frame-rate callbacks are supported, and the reduced-motion preference shows the still frame at 18 seconds.

The high score is kept for the current session only, so a restart of the wallpaper resets it.

`build/check-comet-pinball.mjs` verifies deterministic previews, motion between preview times, the accent colour, trail, score display and multiball settings, invalid values, reduced motion, zero speed, pause, 4K bounding, portrait layout without horizontal overflow, no page errors and offline loading.
