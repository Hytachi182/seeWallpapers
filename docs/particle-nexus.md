# Particle Nexus

A classic particles.js wallpaper in the Tech catalogue: ice-cyan nodes drift over a quiet dark background and form fine lines when they approach one another. Soft particle light and optional pointer connections add depth without a text overlay.

Settings control particle color, background, count (35–180), speed (including zero), connection distance, links, soft light and pointer interaction. Connection range adapts to the viewport so portrait views do not become a dense mesh. The particle count remains the selected count across resizing.

Pointer connections work in a preview or other surface receiving mouse events. On a desktop behind icons, mouse event delivery depends on the wallpaper host and Windows shell; autonomous motion never depends on interaction.

## Library and source

The unmodified [particles.js](https://github.com/VincentGarreau/particles.js) 2.0.0 source is bundled locally with its MIT license and Vincent Garreau's original attribution. Upstream revision: `d01286d6dcd61f497d07cc62bd48e692f6508ad5`.

- Source: `templates/particle-nexus/particles.js`
- Git blob: `325d8349960022a3a6aaef3d1ca94938be622a68`, verified against the pinned upstream file.
- SHA-256: `89c8e085c3da89b31fd63bf88102068b931e58d1de9b64a2b29728ac28827d28`.
- License: `templates/particle-nexus/PARTICLES-LICENSE.md`.

`scene.js` owns host settings, canvas sizing, particle count and animation scheduling. The library initializes with movement disabled, so its native animation loop does not start. The adapter scales each draw's movement by elapsed time and owns the only timer/RAF loop. Pause and hidden pages stop it, FPS changes preserve pause, speed zero stops motion, and reduced motion opens a still frame. Pointer events never redraw a host-paused canvas.

The theme makes no network requests. Preview seeding is temporary and restores `Math.random` immediately after each synchronous library operation. Pixel backing caps at 2,073,600, or 921,600 at 15 FPS and below.

## Delivery and validation

The offline package has six files: `manifest.json`, `index.html`, `scene.js`, `particles.js`, `PARTICLES-LICENSE.md` and `preview.jpg`.

- `node build/capture-template-previews.mjs <temporary-playwright-folder> particle-nexus` captures desktop/portrait previews and verifies every visible setting and pause/resume.
- `node build/check-particle-nexus.mjs <temporary-playwright-folder>` exercises the actual bundled library, deterministic preview, bounded count, zero speed, pause/pointer freeze, FPS cap, reduced motion, resize state and absence of HTTP requests.
- `node build/capture-particle-motion.mjs <temporary-playwright-folder>` records actual movement; Playwright FFmpeg is required.
- `python build/package-particle-nexus.py` packages and verifies the theme with its upstream license.

The preview is a browser screenshot of code-drawn particles. Physical multi-monitor attachment and CPU/GPU consumption remain device-specific checks.
