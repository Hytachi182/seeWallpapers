# Rooftop Rivals

An original self-playing robot fighting game in **Games**. Ion and Rivet exchange punches, kicks, rushes, jumps, guards and energy pulses on an industrial rooftop. Attacks have wind-up, active and recovery timings; melee hits depend on distance and elevation. Pulses use swept collision checks. Blocking reduces damage and jumps can evade attacks. Consecutive unblocked hits within 1.25 seconds count as combos.

Rounds start with 100 health and a 45-second timer. A knockout ends the round; on timeout, the fighter with more health wins, with draws replayed as another round. Two won rounds end a match. Matches restart automatically. HUD values come from real combat state. All graphics, articulated robot designs and animations are authored in code, with no external images, audio or fonts. No Street Fighter characters, sprites, logos, arenas or signature moves are included.

Visual direction: pixel-art robot boxing against a dusk city skyline, muted blue rooftop machinery, peach sun and warm rain reflections. Ion uses mint armor accents and an antenna; Rivet has broad copper shoulder pads. The optional HUD places opposing health bars above the action, with timer, round wins and combo messages. Landscape fills the stage; portrait fits the whole arena against an extended sky.

Settings control Ion's color, fight speed, rain, impact sparks/energy trails and HUD. Host pause/resume, visibility and frame-rate callbacks are supported. Reduced-motion preference begins with a still scene. Simulation uses fixed steps and rendering uses a bounded low-resolution canvas. `index.html?preview=12` generates a deterministic still.

The existing application's template content glob includes this folder. Import the standalone `.seewall` into an installed application. Verify gameplay with `node build/check-rooftop-rivals.mjs`; `build/capture-template-previews.mjs` checks Edge rendering, settings and lifecycle. Real desktop performance depends on hardware.
