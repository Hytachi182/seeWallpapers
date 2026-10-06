# Rain on Glass

A realistic, self-running rain-on-glass wallpaper in the Nature catalogue. An original blue-hour city photograph sits behind a simulated pane of wet glass. Small drops cling to the surface; larger drops slip under gravity, absorb neighboring droplets and leave slowly fading wet trails. A WebGL height-field shader refracts the photograph and gives water curved reflections and directional highlights.

This is a wallpaper rendered behind desktop icons. It does not place transparent water above application windows or sample the live Windows desktop. The visual realism is an approximation of wet glass, not a full fluid solver.

## Settings

| Setting | Behavior |
| --- | --- |
| Rain intensity | Controls arriving drops, from zero to heavy rain. At zero, existing drops continue draining. |
| Droplet speed | Changes the simulation speed. |
| Water refraction | Changes how strongly drops bend the background image. |
| Background softness | Defocuses the distant photograph; water lenses retain sharper details. |
| Glass reflection tint | Colors reflected light and subtly grades the glass. |
| Wet trails | Shows or hides the residue left by moving water. |

Pause, resume, page visibility, reduced motion and the host FPS limit are supported. Reduced motion opens a still wet-glass frame. WebGL loss displays the bundled photograph; restoration rebuilds GPU resources without resetting the simulated drops. The photograph fills every aspect ratio with a centered cover crop.

## Assets and source

The photograph was generated with the built-in Imagegen tool, converted to JPEG and saved as `templates/rain-on-glass/background.jpg`. Its exact generation prompt is in [background-prompt.txt](rain-on-glass/background-prompt.txt) and embedded in the JPEG metadata. The prompt describes a quiet European city at blue hour, wet pavement, amber streetlights and muted blue-grey sky, with no foreground water: all drops on the glass are animated separately.

`templates/rain-on-glass/scene.js` owns the water simulation and renderer lifecycle; `index.html` holds the shader. `build/generate-rain-texture.mjs` embeds the photograph in `background.js` so Chromium can safely upload it to WebGL when opened through the host's `file://` navigation. Run that generator after replacing or changing photograph metadata. Keep the separate JPEG for the static fallback.

The packaged folder contains `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `background.js` and `preview.jpg`. Run `python build/package-rain-on-glass.py` after capturing the preview. All assets are local; there are no network requests or external dependencies in the wallpaper.

## Validation

Run `node build/check-rain-on-glass.mjs <temporary-playwright-folder>` to exercise ten simulated minutes, conserved merge volume, bounded particles, zero rain, portrait dimensions and real Edge shader/lifecycle behavior. `--browser-only` skips the long simulation when only rendering changes. The existing `build/capture-template-previews.mjs` checks desktop/portrait rendering, all settings and pause/resume.

Water simulation resolution stays near 518,400 pixels, independent of screen aspect ratio, with at most 420 moving/stationary drops and 1,200 fine beads. The render target caps at 2,073,600 pixels, or 921,600 at 15 FPS and below. Background blur is cached and recalculated only when the softness setting changes. Real CPU/GPU consumption and desktop attachment on physical monitors still require device validation.
