# Underwater Blue

A living photographic underwater wallpaper in the Nature catalogue. Four larger tropical fish swim across a sandy reef while a distant shoal of eight fish crosses above them. Their tails beat using cached deformations of an original transparent fish photograph. Three streams of rising bubbles and current-borne particles make movement clear at a glance; refraction, sun shafts and seabed light support the scene.

The scene remains quiet and has no text overlay, sound, external fonts or network dependencies. It is a generated photograph-style background with artistic animated optics, not a physical fluid or marine-life simulation.

## Controls and lifecycle

Settings expose marine animation speed (including zero), light level, refraction strength, sun shafts, seabed light, marine particles, bubble streams, larger fish and the distant shoal. Fish, shoal and bubbles are enabled by default. The new `bubbleStreams` setting replaces the old default-off `bubbles` setting, so previously saved values do not silently hide the new bubble animation.

The effect keeps 12 fish, 105 suspended specks and 54 bubbles in memory. Their positions are derived from time, so no new objects accumulate during long sessions. Twenty-four small raster frames are prepared once from the transparent fish image, bending the rear body and tail while keeping the head stable. Drawing reuses these frames rather than warping a full-resolution asset every frame.

Host pause/resume, page visibility and FPS profiles are supported. Reduced motion opens a still frame, and speed zero freezes both rendering layers. Each canvas backing caps at 2,073,600 pixels, or 921,600 at 15 FPS and below. The photograph fills desktop and portrait with a centered cover crop.

The background uses WebGL; particles use a separate transparent Canvas 2D overlay. Context loss displays the bundled static photograph and hides the particle overlay. Restoration rebuilds GPU resources and preserves the time/pause state. A device without WebGL receives the photograph with a short recovery message.

## Source and provenance

The original photograph-style background was created with the built-in Imagegen tool, converted to JPEG and saved as `templates/underwater-blue/background.jpg`. Its [exact prompt](underwater-blue/background-prompt.txt) is retained in documentation and embedded in JPEG metadata. A separate original transparent fish image was generated with Imagegen and saved as `fish.png`, with its [fish prompt](underwater-blue/fish-prompt.txt) embedded in PNG metadata. The saved source images remain unchanged by runtime animation; all fish positioning, tail deformation and bubbles are rendered separately.

`scene.js` owns the lifecycle, fish animation, foreground particles and WebGL initialization. `index.html` holds the original water-light shader. `build/generate-underwater-texture.mjs` embeds the JPEG and fish PNG in `background.js` for safe offline image loading and Chromium `file://` texture upload. Rerun it whenever either image or its metadata changes; retain the separate JPEG for fallback.

## Delivery and validation

The seven-file offline package contains `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `background.js`, `fish.png` and `preview.jpg`.

- `node build/capture-template-previews.mjs <temporary-playwright-folder> underwater-blue` captures desktop/portrait previews and verifies all controls and pause/resume.
- `node build/check-underwater-blue.mjs <temporary-playwright-folder>` checks bounded fish trajectories over ten minutes, independently visible fish/bubble movement, actual shader compilation/file-origin texture loading, deterministic layers, zero speed, pause/FPS, context recovery, reduced motion, no-WebGL fallback and offline operation.
- `node build/capture-underwater-motion.mjs <temporary-playwright-folder>` records ten seconds of the living scene to `underwater-blue-living-motion.webm`; Playwright FFmpeg is required.
- `python build/package-underwater-blue.py` validates the embedded image and package contents, producing `dist/underwater-blue.seewall`.

Physical monitor attachment and CPU/GPU consumption across real displays remain device-specific checks.
