# Inkbound Courier

An original manga wallpaper in the Anime collection: a rooftop messenger above a fictional coastal town, rendered in midnight ink, ivory paper and vermilion. The detailed illustration uses cross hatching and screentone shading rather than an existing series or character.

Wind carries tumbling red petals at three depths. Coastal birds cross the distant skyline, source-texture refraction animates the harbor, soft mist drifts above it and selected town windows gently brighten. The character, clothing, scarf and buildings retain their original shapes. There is no sound or text overlay.

Customize animation speed (0–2), petal density (0–2), harbor mist, window lights coastal birds and harbor water. Speed zero and the system's reduced-motion preference display the unmodified illustration. Host pause/resume, visibility changes and FPS settings control the animation loop; the render surface is bounded to 1920 × 1080.

Portrait screens use a cover crop biased toward the messenger. The scene loads entirely offline, with no external fonts, libraries or network requests.

## Artwork provenance

The background was generated for this theme using Imagegen, then converted to JPEG. The [exact generation prompt](inkbound-courier/artwork-prompt.txt) is retained and embedded in the JPEG metadata. It explicitly requests an original adult character and fictional town, and excludes existing characters, franchises, logos, recognizable franchise uniforms and artist imitation. No third-party manga scans, screenshots, music or downloaded assets are included. This records the creation process rather than asserting legal clearance for every possible similarity.

`preview.jpg` is a browser capture of this scene, not a separate sourced image. Animation is original Canvas code in `templates/inkbound-courier/scene.js`.

## Build and verification

The app's existing template content glob includes this theme in future builds. Import `dist/inkbound-courier.seewall` to add it to an existing installation. Build that package with `python build/package_inkbound_courier.py` after capturing its preview.

With Playwright installed in a temporary folder:

```powershell
node build/capture-template-previews.mjs <temporary-folder> inkbound-courier
node build/check-inkbound-courier.mjs <temporary-folder>
```

The shared capture validates desktop/portrait rendering, every setting and pause/resume. The scene check verifies stable character pixels with petals disabled, a 24-hour deterministic preview, reduced motion, speed zero, the 4K rendering budget and offline loading. These browser checks do not measure performance on every GPU or prove real desktop attachment.

Animation revision 1.0.1 uses the shared offline motion helper, bundled as `motion.js` in each package. Its requestAnimationFrame clock honors 15/30/60 FPS budgets without recounting elapsed time. Regenerate identical helper copies with `python build/sync-living-scene-motion.py`; verify scheduling with `node build/check-living-scene-clock.mjs`.
