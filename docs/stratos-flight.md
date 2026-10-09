# Stratos Flight

An original aviation wallpaper in the Cinematic collection. Fictional combat jets fly through a high-altitude blue-and-gold cloudscape, with a close formation and a smaller distant group.

The aircraft are separate transparent sprites, not painted into the background. They cross the viewport, bank gently along curved paths and keep their complete airframe geometry. Wingmen share their leader's route with formation offsets. Engine exhaust and contrails follow the aircraft's actual position and orientation; foreground vapor supplies another moving depth layer.

## Controls and runtime

Customize flight speed (0–2), formation wingmen, contrails, engine exhaust glow, foreground cloud vapor and banking. Host pause/resume, visibility changes and FPS settings control one requestAnimationFrame loop. Speed zero and reduced motion freeze the formation. The render surface is bounded to 1920 × 1080, with larger aircraft relative to the width on portrait screens so their silhouettes remain readable.

The background uses a cover crop while aircraft paths follow the viewport. Aircraft and vapor repeat only after leaving the frame; contrails stop at a path reset so no trail crosses the screen as a straight seam. There is no sound, text overlay, external font, downloaded library or network request.

## Artwork provenance

The background, fictional jet and transparent cloud vapor were generated independently for this theme using Imagegen. Their exact prompts are retained in [background-prompt.txt](stratos-flight/background-prompt.txt), [jet-prompt.txt](stratos-flight/jet-prompt.txt) and [cloud-prompt.txt](stratos-flight/cloud-prompt.txt), and embedded in asset metadata. The aircraft brief requests an original design without real-unit markings, numbers, logos, franchise designs or weapon launches. No third-party aircraft photograph or military insignia is included.

## Packaging and checks

The application includes this folder through its existing template content glob. Import `dist/stratos-flight.seewall` into an existing installation. Use `index.html?preview=4` for the gallery composition.

```powershell
node build/capture-template-previews.mjs <temporary-playwright-folder> stratos-flight
node build/check-stratos-flight.mjs <temporary-playwright-folder>
python build/package_stratos_flight.py
```

`motion.js` is the independently bundled copy of the shared scheduling helper. Keep it synchronized with `python build/sync-living-scene-motion.py`. Packaging verifies all eight files, archive CRC and byte equality.
