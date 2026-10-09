# Emberwatch Knight

An original medieval wallpaper in the Cinematic collection. An armored knight patrols a stone terrace before a twilight castle, pauses to raise a shield and practices controlled sword movements. A teal cape responds to wind; distant mist, localized brazier flames and drifting embers support the scene.

## Character animation

The knight is assembled from twelve separate pieces in a transparent armor atlas. Helmet, breastplate, hip guard, shoulder plates, arms, legs, shield, sword and cape retain their painted materials. Joint transforms articulate the arms, and two-bone inverse kinematics bends the knees toward moving foot targets. The 36-second routine alternates two walking passages with guard, sword and idle poses. Cape strips have a fixed neck attachment and stronger motion toward the hem.

The walking ground and character size follow the viewport; portrait reduces the patrol span and scales the knight to retain the shield and sword. The background uses cover cropping. No sound, HUD, external font, library download or network request is included.

## Settings

Customize animation speed (0–2), sword/shield practice, flowing cape, torch flames, valley mist and embers. Host pause/resume, visibility suspension and performance settings control one requestAnimationFrame loop. Speed zero and reduced motion freeze the complete pose and atmosphere.

## Artwork provenance

The original castle background and modular armor atlas were generated for this theme with Imagegen. Exact prompts are retained in [background-prompt.txt](emberwatch-knight/background-prompt.txt) and [armor-prompt.txt](emberwatch-knight/armor-prompt.txt), and embedded in the shipped assets. The briefs exclude franchise motifs, logos and real-world heraldry. No borrowed knight sprite, castle photograph or soundtrack is included.

`build/generate-knight-parts.py` describes alpha bounds within inspected atlas regions without changing the source image. Re-run it after replacing the atlas, then review the source regions and joint placement. `motion.js` is the independent copy of the shared offline clock; synchronize it with `python build/sync-living-scene-motion.py`.

## Package and verification

Import `dist/emberwatch-knight.seewall` into an existing installation. The application includes the theme folder in future builds through its existing content glob. `index.html?preview=12.8` shows a sword-practice pose.

```powershell
python build/generate-knight-parts.py
node build/capture-template-previews.mjs <temporary-playwright-folder> emberwatch-knight
node build/check-emberwatch-knight.mjs <temporary-playwright-folder>
python build/package_emberwatch_knight.py
```

The shared capture covers desktop/portrait, each setting and pause/resume. The dedicated regression check samples the full routine, verifies body-pose changes with all environmental animation disabled, checks a 24-hour preview, zero speed, reduced motion, bounded 4K rendering and offline loading. Packaging verifies all eight files, archive CRC and byte equality. Browser checks do not establish physical desktop attachment or performance on every GPU.
