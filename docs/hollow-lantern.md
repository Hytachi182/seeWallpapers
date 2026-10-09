# Hollow Lantern

An original Halloween wallpaper in the Cinematic collection: a crooked manor, violet moonlight, autumn trees and glowing jack-o-lanterns. The tone is friendly and eerie, with no gore.

The ghost is a separate transparent character that floats across the clearing and bobs gently. Its face remains rigid while the lower cloth flutters. Seven small bats traverse the sky with independently animated wings. Pumpkin light flickers at the painted lantern faces; low mist passes across the path and autumn leaves follow shared wind gusts.

## Controls

Customize speed (0–2), ghost, bats, pumpkin lights, ground mist and leaves. Host pause/resume, performance changes and visibility suspension control a single requestAnimationFrame loop. Zero speed and reduced motion freeze the whole scene. The render surface is bounded to 1920 × 1080; portrait keeps the ghost's path near the center while the background uses cover cropping.

No sound, HUD, external font, downloaded library or network request is included.

## Artwork provenance

The background and transparent ghost were generated independently with Imagegen for this theme. The exact [background prompt](hollow-lantern/background-prompt.txt) and [ghost prompt](hollow-lantern/ghost-prompt.txt) are retained and embedded in asset metadata. They request original imagery and exclude franchise characters, logos and borrowed artwork. Bats and atmosphere use original Canvas animation code.

## Packaging and checks

Import `dist/hollow-lantern.seewall` into an existing installation. The application's existing content glob includes this folder in future builds. `motion.js` is independently bundled from the shared offline clock; keep it synchronized with `python build/sync-living-scene-motion.py`.

```powershell
node build/capture-template-previews.mjs <temporary-playwright-folder> hollow-lantern
node build/check-hollow-lantern.mjs <temporary-playwright-folder>
python build/package_hollow_lantern.py
```

The shared capture verifies desktop/portrait rendering, every control and pause/resume. The dedicated check verifies character movement with atmosphere disabled, a 24-hour preview, reduced motion, speed zero, the 4K render budget and offline loading. Packaging verifies all seven files, archive CRC and source-byte equality. Browser verification does not establish physical desktop attachment or GPU performance.
