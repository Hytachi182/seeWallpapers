# Burrow Battle

An original, offline artillery wallpaper inspired by turn-based battle games. Six tiny burrowers split into Meadow and Ember crews fight on two meadow islands at sunset. All characters, scenery and effects are drawn procedurally; no external assets are required.

The wallpaper plays automatically, like Neon Tetris. Each crew alternates movement, aiming and firing. Agents search ballistic trajectories using the same gravity and wind model as live shots. Rockets and explosive grenade rounds remove soil, damage nearby opponents and knock them into the sea. Grenades detonate on impact. Surviving crew health decides a round after elimination or 48 turns; draws award no win. A fresh battlefield starts automatically and crew win totals persist during the session.

Settings control Meadow color, battle speed, clouds, explosion effects and the health/wind display. Host pause/resume, visibility suspension, frame-rate limits and reduced-motion stills are supported. Portrait views retain the entire battlefield with sky and sea filling the remaining space.

Import `dist/burrow-battle.seewall` into an installed seeWallpaper, or build the application to include the theme through the existing template content glob. `index.html?preview=12` produces a deterministic preview. `node build/check-burrow-battle.mjs` verifies combat rules and twenty simulated minutes. `build/capture-template-previews.mjs` checks actual Edge rendering, settings and lifecycle. Physical desktop attachment and hardware performance require live application validation.
