# Winter Snowfall

A photographic snowfall wallpaper in the Nature catalogue. A quiet alpine forest and snow-covered chalet sit beneath a cold blue-hour sky. Warm windows contrast with the snow and mountain mist. The photograph remains fixed while three separate depth layers of snow drift across it.

Distant flakes are small and slower, midground flakes have gentle lateral flutter, and nearby flakes are larger with soft photographic defocus. Smooth gusts influence the signed wind direction. Edge fades and recycling keep the snowfall continuous; the scene does not accumulate extra snow on the already snowy ground.

The chalet is alive too: smoke rises from the chimney and leans with the wind setting, firelight flickers in the five lit windows, a thin mist drifts across the lake and, every few seconds, a branch somewhere sheds a clump of snow. These effects are mapped onto the photograph by image fractions, so they stay anchored at any crop, and can be turned off with the chalet toggle.

## Settings and lifecycle

Controls expose snowfall intensity, speed (including zero), signed wind, flake size, nearby flakes, depth of field and chalet life. All three layers have bounded counts: 356 flakes at default intensity, 71 at minimum and 890 at maximum. Only three small flake sprites are cached; there are no per-frame image filters.

Host pause/resume, document visibility and FPS profiles are supported. Reduced motion opens a still winter frame. A speed of zero freezes particle positions and light variation. Pixel backing caps at 2,073,600, or 921,600 at 15 FPS and below. The photograph uses a centered cover crop on both desktop and portrait, retaining the chalet as the main anchor.

## Asset provenance and ownership

The original photograph-style background was created with the built-in Imagegen tool, converted to JPEG and saved as `templates/winter-snowfall/background.jpg`. Its [exact generation prompt](winter-snowfall/background-prompt.txt) is retained in documentation and embedded in JPEG metadata. The prompt explicitly excludes falling snow: every moving flake is rendered separately by code.

`templates/winter-snowfall/scene.js` owns the original simulation, cached flake shapes, drawing and lifecycle. The theme has no text overlay, sound, external fonts, downloaded libraries or network requests.

## Delivery and checks

The offline package contains five root files: `manifest.json`, `index.html`, `scene.js`, `background.jpg` and `preview.jpg`.

- `node build/capture-template-previews.mjs <temporary-playwright-folder> winter-snowfall` captures desktop/portrait images and verifies all settings and pause/resume.
- `node build/check-winter-snowfall.mjs <temporary-playwright-folder>` exercises ten simulated minutes, bounded counts, directional wind, deterministic rendering, speed zero, pause/FPS and reduced motion in Edge.
- `node build/capture-snow-motion.mjs <temporary-playwright-folder>` records eight seconds of actual snowfall; Playwright FFmpeg is required.
- `python build/package-winter-snowfall.py` packages and verifies `dist/winter-snowfall.seewall`.

Physical desktop attachment and long-running CPU/GPU consumption on the user's monitors remain device-specific checks.
