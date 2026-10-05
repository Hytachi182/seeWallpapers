# Crystal Run

An original, offline, self-playing pixel platform adventure in the **Games** category. A survey robot traverses floating ruins, jumps across gaps and over obstacles, collects crystals, avoids clockwork beetles and reaches a survey beacon. Completing a trail generates the next course and rotates dawn, twilight and moonlight palettes. Falls and collisions return the robot to its last safe checkpoint.

All artwork is drawn by `scene.js`; no external downloads, sprites, fonts, sounds or branded characters are used. This theme borrows the general side-scrolling platform genre, with its own name, robot, enemies, collectibles, scenery and palette.

Settings control robot/crystal color, adventure speed, parallax, sparkles and the progress display. The host pause/resume, visibility and frame-rate callbacks are supported. Physics uses fixed simulation steps independently of frame rate. Rendering uses a bounded low-resolution pixel buffer. Reduced-motion preference opens a still scene; the host can explicitly resume it.

`index.html?preview=12` renders a deterministic still after twelve seconds. The template folder is automatically included by the application's existing template content glob.

Visual direction: an experience-first scene with crisp low-resolution pixels, muted blue stone and peach skies, a teal survey robot and warm amber lens. Floating geological shelves and broken observatories establish its own setting. A compact optional HUD shows real collected crystals and trail progress; it can be hidden for a clean desktop. The world fills landscape and portrait viewports without bars. Artwork stays at 360 logical pixels high to bound rendering cost.

Validation: `node build/check-crystal-run.mjs` exercises ten simulated minutes, deterministic previews and bounded world/particle state. `build/capture-template-previews.mjs` checks the real Edge renderer, landscape/portrait, settings and host lifecycle. Physical desktop performance remains dependent on the user's hardware.
