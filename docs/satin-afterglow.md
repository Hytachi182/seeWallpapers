# Satin Afterglow

An original manga fashion wallpaper in the Anime collection. A clearly adult woman in an opaque burgundy evening dress sits on a rose-framed rooftop terrace at twilight. Plum shadows, rose-gold light and a distant city create a glamorous, romantic atmosphere.

The scene follows a restrained fashion-editorial brief: adult proportions, a mature face, a fully covered chest, a dress below the knee and a relaxed seated pose. It includes no nudity, lingerie, sexual activity, school-uniform imagery or franchise characters.

Rose petals drift at three depths, lantern flames lean and flicker with their warm light, distant city haze moves and tiny stars glimmer in the sky. The character's face, body and clothing are not deformed. No audio or text overlays are included.

## Settings and runtime

Customize animation speed (0–2), rose petal density (0–2), twilight haze, warm lantern lights and star glimmers. Host pause/resume, visibility changes and FPS settings control the animation loop. Speed zero and reduced motion display the unmodified illustration. The render surface is bounded to 1920 × 1080; portrait uses a cover crop biased toward the character.

All assets load offline, with no external libraries, fonts or network requests. The app's existing template content glob includes this scene in future builds. Import `dist/satin-afterglow.seewall` into an existing installation.

## Artwork provenance

The illustration was generated for this theme using Imagegen and converted to JPEG. The [exact generation prompt](satin-afterglow/artwork-prompt.txt) is retained and embedded in the artwork metadata. It specifies an adult aged 28–32, fully clothed fashion glamour and original artwork, and excludes existing characters, franchise costumes, logos and artist imitation. No third-party manga scans, screenshots or music are included.

`preview.jpg` is a rendered browser capture of the theme. The animation is original Canvas code adapted from Inkbound Courier's existing lifecycle.

## Verification and packaging

Install Playwright in a temporary folder, then run:

```powershell
node build/capture-template-previews.mjs <temporary-folder> satin-afterglow
node build/check-satin-afterglow.mjs <temporary-folder>
python build/package_satin_afterglow.py
```

The shared capture checks desktop/portrait rendering, each setting and pause/resume. The scene check covers stable character pixels with petals disabled, a 24-hour preview, reduced motion, speed zero, the 4K render budget and offline loading. Packaging verifies archive integrity and byte equality. Browser verification does not establish real desktop attachment or performance on every GPU.

Animation revision 1.0.1 uses the shared offline motion helper, bundled as `motion.js` in each package. Its requestAnimationFrame clock honors 15/30/60 FPS budgets without recounting elapsed time. Regenerate identical helper copies with `python build/sync-living-scene-motion.py`; verify scheduling with `node build/check-living-scene-clock.mjs`.
