# Galactic Battle

An original cinematic orbital battle in the Cinematic catalogue. A generated photographic ring-shaped industrial cruiser and blue planetary limb form a stable backdrop. Six curved ceramic interceptors and three asymmetric nacelle raiders cross the viewport at different sizes, directions and speeds; the spacecraft are generated transparent photographic sprites rather than geometric approximations.

The scene owns nine bounded ship actors, 27 staggered laser slots, four local explosion sites with 28 sparks each, 40 drifting debris particles and 70 scintillating stars. Red lasers belong to the light fighters and green lasers to the dark adversaries. Bolts retain the ship position at their launch time. Engine glow and explosion light use two cached radial textures. The cruiser and planet remain stable; this is an animated layered scene, not a simulated 3D camera.

Controls expose speed (0–2), battle light intensity (0.3–1.6), fighters, engines, lasers, explosions, stars and debris. Defaults enable all effects. Speed zero freezes the complete scene. Preview time is deterministic. Reduced motion opens a still frame; pause and hidden pages stop the single timer/RAF loop. FPS profile changes preserve pause. The backing canvas caps at 2,073,600 pixels, or 921,600 at 15 FPS and below, with device pixel ratio capped at 1.5.

The backdrop uses centered cover scaling. Ship paths use viewport coordinates so they cross desktop and portrait views. Image failure leaves the backdrop fallback and a reinstall message. The scene has no audio, HUD, network requests or external libraries.

## Assets and delivery

The background, light fighter and dark fighter were generated for this theme. Exact prompts are in `galactic-battle/background-prompt.txt`, `fighter-prompt.txt` and `enemy-prompt.txt`, and are embedded in the image metadata. The JPEG background was encoded from the generated bitmap; transparent PNG alpha is retained. The preview is an actual Edge rendering. The three spacecraft designs were independently generated around distinct ring, curved-body and asymmetric nacelle silhouettes. Asset generation does not establish legal clearance.

The seven-file offline package contains `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `fighter.png`, `enemy.png` and `preview.jpg`.

- `node build/check-galactic-battle.mjs <temporary-playwright-folder>` checks bounded actors over ten simulated minutes and real Edge motion, deterministic preview, pause, speed zero, FPS, reduced motion and offline use on desktop and portrait.
- `node build/capture-template-previews.mjs <temporary-playwright-folder> galactic-battle` exercises every setting and captures previews.
- `node build/capture-galactic-motion.mjs <temporary-playwright-folder>` captures ten seconds of actual animation to `build/visual-review/galactic-battle-original-motion.webm`.
- `python build/package-galactic-battle.py` produces `dist/galactic-battle.seewall` and checks CRC and byte-for-byte asset equality.

The local MP4 is `build/visual-review/galactic-battle-original-motion.mp4`. Hardware-specific desktop attachment and physical-monitor frame rate remain separate from headless browser validation.
