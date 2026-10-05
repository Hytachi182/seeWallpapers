# Neon Rally

A self-playing retro paddle duel in **Games**. Mint and Coral predict the ball's arrival by folding its trajectory across the top and bottom court boundaries. Their reaction delays, bounded movement speed and imperfect targeting make rallies competitive rather than endless. Paddle position and motion affect rebound angle and spin. Ball speed grows with each return, capped at 490 logical pixels per second.

Missing the ball awards the opponent a point, followed by a one-second serve. The first player to seven wins a match; after a 2.6-second result display, the next match begins with scores reset. Session match wins and longest rally remain visible. Scoring is driven by ball positions, with swept paddle-plane detection and fixed-step physics. No external assets, fonts, audio or network access are required.

Visual direction: a restrained pixel court in deep blue, mint and coral paddles, a cream square ball, authored bitmap score digits and an optional fading trail. Court lighting and impact pulses can be disabled. The entire arena fits landscape and portrait displays without cropping. Settings control left-player accent, game speed, trail, lighting and telemetry. The host pause/resume, visibility and frame-rate callbacks are supported. Reduced-motion preference initially shows a still scene. The render buffer is bounded for large displays.

`index.html?preview=12` generates a deterministic still. The application includes the template through its existing content glob; import the standalone `.seewall` into an installed application. `build/check-neon-rally.mjs` validates actual game rules and sustained play. `build/capture-template-previews.mjs` checks real Edge rendering, settings and lifecycle.
