# Biker Road

An offline animated wallpaper based on the user-supplied `biker_road_wallpaper.svg`. The SVG contains a single embedded 1672 × 941 PNG, rather than separate vector layers. `artwork.jpg` is a high-quality conversion of that image; the input SVG is untouched.

The rider and camera stay fixed. Version 1.1 animates the painted asphalt itself with overlapping perspective zoom passes through a feathered road mask, adds visible speed trails inside the left lane, drifting cloud textures, golden ripples in selected sea channels and a pulsing red tail light. It does not reconstruct a moving motorcycle or a continuous 3D road.

Version 1.2 adds a flock with beating wings above the bay, expanding exhaust puffs from both pipes, warm roadside dust moving toward the viewer and slowly sweeping sunset rays. Each addition has its own on/off setting and follows the same speed, intensity, pause and reduced-motion controls.

Import `Biker-Road.seewall` through seeWallpaper's **Import** action, then preview or apply **Biker Road**. `templates/biker-road/index.html` also plays directly in a browser. No network requests or dependencies are needed. Speed, atmosphere intensity and individual road/cloud/water/tail-light effects are adjustable in **Customize**. Intensity zero and reduced motion show the still image. Pause, hidden documents and performance FPS callbacks are supported; backing resolution is capped at 1920 × 1080.

Verification commands (Playwright installed outside the repository):

```powershell
node build/capture-template-previews.mjs "$env:TEMP\seewallpaper-visual-check" biker-road
node build/check-biker-road.mjs "$env:TEMP\seewallpaper-visual-check"
```

Browser checks cover wide/narrow layouts, setting changes, stable rider pixels, pause/resume, reduced motion and zero intensity. Live WebView2 desktop attachment and performance are separate checks.
