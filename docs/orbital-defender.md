# Orbital Defender

An original self-playing arcade space shooter in **Games**. An autopilot leads moving targets, fires at the lowest drone in each column and dodges approaching projectiles. Formation speed increases as drones disappear. Enemy fire and player lasers erode the tiled shields; contact with descending drones also destroys shield tiles. Clearing a formation starts a new wave with fresh shields. Losing three ships or allowing a formation to reach the outpost ends the game and automatically launches a new flight.

The score and local best are real game results. Best-score persistence is optional; blocked browser storage does not prevent play. The three drone silhouettes, interceptor, courier, planet and effects are drawn entirely in code. No third-party sprites, characters, logos, fonts or audio are included. The theme draws on the general fixed-screen space-shooter genre.

Visual direction: dark orbital space, restrained blue planetary rings, geometric pixel drones in four row colors, mint lasers and peach enemy fire. The combat field fits landscape and portrait screens. Optional compact telemetry shows score, wave, remaining ships and flight number. Rendering uses a bounded pixel buffer; physics uses fixed steps independent of frame rate.

Settings control ship/laser color, game speed, explosions, moving stars and telemetry. Host pause/resume, visibility and frame-rate callbacks are supported. Reduced-motion preference opens a still frame; explicit host resume starts the game. `index.html?preview=12` produces a deterministic snapshot of the simulation (the persisted best may differ).

The existing application content glob includes this folder. Import the standalone `.seewall` package into an installed application. Validate the simulation with `node build/check-orbital-defender.mjs` and the real renderer with `build/capture-template-previews.mjs`.
