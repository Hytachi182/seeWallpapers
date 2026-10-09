# Gilded Court

An original royal wallpaper in the Cinematic collection: an ivory-and-gold palace at dusk, a sapphire-robed adult sovereign and a marching guard procession. The animation includes independent character motion, articulated legs, flowing gown and banners, fountain jets, moving droplets and water refraction, warm palace lights and drifting rose petals.

## Motion and controls

Three guards cross the terrace in a repeating procession, with articulated arms and two-bone leg IK. Grounded feet cancel the procession velocity during stance; gait timing derives from stride length and world speed, with a lifted Hermite swing between steps. The sovereign moves slowly along the foreground; her face and upper body remain rigid while the gown hem responds to wind. Soft contact shadows anchor the characters to the terrace.

Cloth and banners are composed on integer offscreen rows before placement, avoiding alpha seams between animated strips. Across-width fold lighting and hem shading give depth to plain blue-and-gold banners, which attach to the background's empty flag poles. Fountain effects are clipped to the basin and aligned to its painted water source; illumination aligns to palace windows and lamps.

Customize speed (0–2), guard procession, sovereign, gown wind, banners, fountain, lights and petal density (0–2). Host pause/resume, visibility changes, reduced motion, zero speed and FPS budgets control one requestAnimationFrame loop. The render surface is bounded to 1920 × 1080. Portrait keeps the sovereign close to center while cropping the background.

No sound, HUD, external font, library download or network request is included.

## Asset provenance

The palace and transparent adult sovereign were generated with Imagegen for this theme. Exact prompts are retained in [background-prompt.txt](gilded-court/background-prompt.txt) and [sovereign-prompt.txt](gilded-court/sovereign-prompt.txt), and embedded in asset metadata. The briefs exclude real monarchy insignia, logos, franchise imagery and real-person likenesses.

The guards reuse seeWallpaper's original [Emberwatch Knight armor atlas](emberwatch-knight.md#artwork-provenance), bundled independently with its component descriptors; no sibling-folder loading is required. `build/generate-royal-figure.py` describes the sovereign's alpha bounds without changing her image. `motion.js` is independently bundled from the shared offline helper.

## Package and validation

Import `dist/gilded-court.seewall` into an existing installation. Future app builds include this folder through the existing content glob.

```powershell
python build/generate-royal-figure.py
node build/capture-template-previews.mjs <temporary-playwright-folder> gilded-court
node build/check-gilded-court.mjs <temporary-playwright-folder>
node build/check-royal-gait.mjs
python build/package_gilded_court.py
```

The shared capture checks desktop/portrait, all settings and pause/resume. The dedicated check verifies procession motion with environmental effects disabled, a 24-hour preview, reduced motion, zero speed, bounded 4K rendering and offline loading. The package verifier checks all eleven assets, archive CRC and source-byte equality. Browser checks do not establish physical desktop attachment or performance on every GPU.
