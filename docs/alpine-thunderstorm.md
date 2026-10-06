# Alpine Thunderstorm

A photographic, automatic thunderstorm wallpaper in the Nature catalogue. A distant village and dark alpine lake sit below a heavy cloud ceiling. Animated rain has three depth layers and responds to directional wind gusts. Drifting moisture haze and small water-impact ripples add atmosphere.

Occasional branched discharges light the clouds, briefly lift the landscape exposure and reflect softly on the lake. Lightning channels use hierarchical displacement rather than a regular zigzag; their endpoints remain in the sky. This is an artistic intra-cloud lightning effect, not a weather forecast or physical atmospheric solver.

## Settings and lifecycle

Controls expose rain intensity (including zero), weather speed (including zero), signed wind, lightning on/off, target flash interval, brightness, haze and water effects. The interval varies around the selected value to keep the storm natural. At default rain intensity, 465 drops remain in memory; maximum intensity caps at 1,163. Only one active lightning channel with five short branches exists at a time, with 110 path vertices total.

The source photograph remains fixed. Pause/resume, page visibility and FPS profiles are supported. Reduced motion opens a still frame and suppresses lightning entirely, including after an explicit resume. Speed zero freezes every time-driven effect. Pixel backing caps at 2,073,600, or 921,600 at 15 FPS and below. Desktop and portrait use a centered cover crop.

## Asset provenance and source

The original photograph-style background was created with the built-in Imagegen tool, converted to JPEG and saved as `templates/alpine-thunderstorm/background.jpg`. Its [exact prompt](alpine-thunderstorm/background-prompt.txt) is retained in documentation and JPEG metadata. The prompt excludes lightning and foreground rain: all visible discharges, precipitation and moving surface effects are code-drawn.

`scene.js` owns the simulation, branch generation, sky lighting, lake mask and lifecycle. The theme runs offline without external libraries, fonts, sound or network requests. The preview is an Edge screenshot of the complete scene during its first discharge.

## Delivery and checks

The offline package has five root files: `manifest.json`, `index.html`, `scene.js`, `background.jpg` and `preview.jpg`.

- `node build/capture-template-previews.mjs <temporary-playwright-folder> alpine-thunderstorm` captures desktop/portrait views and exercises settings/lifecycle. Flash controls are sampled during a deterministic active discharge.
- `node build/check-alpine-thunderstorm.mjs <temporary-playwright-folder>` verifies ten simulated minutes, bounded rain/channel data, interval response, disabled lightning, reduced-motion suppression and real Edge lifecycle behavior.
- `node build/capture-storm-motion.mjs <temporary-playwright-folder>` records eight seconds starting just before a discharge; Playwright FFmpeg is required.
- `python build/package-alpine-thunderstorm.py` produces and verifies `dist/alpine-thunderstorm.seewall`.

Physical monitor attachment and long-running CPU/GPU use remain device-specific checks.
