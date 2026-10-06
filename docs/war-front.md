# War Front

An offline animated theme in the Cinematic catalogue, based on the supplied `E:\Downloads\war_game_wallpaper.svg`. Its illustration depicts soldiers overlooking a burning harbour at sunset, with jets and helicopters overhead.

The source SVG contains a single embedded PNG rather than independently editable vector objects. `templates/war-front/artwork.svg` preserves that file unchanged. The wallpaper loads it locally and animates environmental layers without regenerating the image or moving the whole composition.

## Animation

- Feathered smoke crops from sky-only portions of the original rise and drift visibly above the city in 20 overlapping smoke sheets.
- Twelve fire sources carry 84 animated flame tongues and 168 staggered rising embers.
- Eighteen longer, frequent tracer paths cross the sky in staggered salvos.
- Six distant impact sites pulse locally, throw sparks and release rising smoke sampled from the supplied artwork. City explosions are enabled by default and can be disabled.
- Jet exhaust pulses and short helicopter rotor sweeps add aircraft activity; the aircraft bodies remain fixed.
- Reflections shimmer inside a harbour mask.

Foreground silhouette masks protect the original soldiers and ruined wall from every effect, including light blooms. The theme has no HUD, audio, external fonts or network requests.

Host controls expose animation speed (including zero), atmosphere intensity and individual smoke/fire/tracer/aircraft/explosion/water toggles. Intensity zero displays the supplied artwork without animated layers. Pause/resume, page visibility and the FPS profile are supported. Reduced motion opens a still frame. The backing canvas caps at 2,073,600 pixels, or 921,600 at 15 FPS and below; particle and effect counts stay fixed.

Desktop keeps the complete composition when the aspect ratio matches. Other aspect ratios use a cover crop, with the portrait crop biased toward the main soldier. The original source file stays unchanged regardless of crop or settings.

## Development and delivery

`templates/war-front/scene.js` owns the procedural effects, mask coordinates and lifecycle. Coordinates refer to the supplied 1672 by 941 artwork. The five-file package contains `manifest.json`, `index.html`, `scene.js`, `artwork.svg` and `preview.jpg`.

- Capture previews with `node build/capture-template-previews.mjs <temporary-playwright-folder> war-front`.
- Run `node build/check-war-front.mjs <temporary-playwright-folder>` for original soldier stability across three times on desktop/portrait, isolated smoke/fire/tracer/explosion motion, zero speed, zero intensity, pause/FPS and reduced motion.
- Record motion with `node build/capture-war-motion.mjs <temporary-playwright-folder>`; this requires Playwright's FFmpeg component. The new artifact is `war-front-active-motion.webm` (10 seconds), converted to `war-front-active-motion.mp4`.
- Package with `python build/package-war-front.py` to produce and verify `dist/war-front.seewall`.

Artwork provenance: the user's supplied SVG, copied byte for byte. It was not generated or edited during this change. The preview is an Edge screenshot of that artwork with the animation layers. Physical desktop attachment and CPU/GPU performance on the user's monitors remain device-specific validation.
