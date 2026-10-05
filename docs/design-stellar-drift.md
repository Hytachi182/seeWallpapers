# Stellar Drift visual world

## Overview

Stellar Drift is an Experience-mode wallpaper in the existing gallery: a luminous golden particle sphere surrounded by a violet stardust disk. The scene fills the screen against deep plum space, with no visible text, Nova lettering, controls or overlays. The direction follows [prisoner849's particle animation](https://codepen.io/prisoner849/pen/RwyzrVj); the shipped renderer is original, offline WebGL with no external runtime or Three.js dependency.

This document applies only to this wallpaper. Desktop composition is the accepted finish scope; cropping of the disk on portrait displays is accepted.

## Colors

The background is `#160016`. The vertex shader blends gold (`vec3(0.89, 0.608, 0.0)`) toward the configurable outer-dust accent, default `#6432ff`, according to particle position. Brightness multiplies the particle tint; additive blending builds luminous overlap without a separate bloom pass.

## Layout

A full-viewport canvas has no margins or scrolling. A perspective camera looking from approximately `(0, 4, 21)` toward the origin uses a 60-degree lens. The sphere remains the visual anchor while the disk extends beyond the viewport. Aspect changes update projection and backing-store size rather than repositioning artwork into a separate mobile layout. The fallback JPEG uses `object-fit: cover`.

## Elevation & Depth

Depth comes from perspective, point-size attenuation, the spherical shell and tilted disk. Soft circular point sprites accumulate light through additive blending; depth testing is disabled. Preserve the granular dust texture and readable spherical silhouette.

## Shapes

The deterministic seed (`849`) produces 150,000 particles: one third form a shell at radii 9.5–10, and the remainder form a thin disk extending to radius 40. Shell and disk particles are interleaved so economical rendering retains both. The composition has a 0.2-radian tilt.

## Components

The scene rotates at `0.025` radians per second at default speed. Each particle also follows its own shader-driven drift. Speed scales elapsed simulation time from 0.1 to 2; particle brightness ranges from 0.3 to 2. The outer-dust colour changes the accent while retaining the gold.

The SDK reads initial settings and supports live settings, pause/resume and performance changes. Document invisibility stops frame scheduling. The default target is 30 FPS; reduced-motion preference caps it at 15 FPS. Profiles at or below 15 FPS draw 75,000 particles and enlarge point size by `sqrt(2)` to retain brightness. Backing resolution is capped at 2,073,600 pixels, device ratio 1, and ratio 0.75 for economical profiles. WebGL context loss shows the bundled preview; restoration rebuilds the renderer. Unsupported WebGL or initialization failure also shows the preview without text.

## Do's and Don'ts

- Do preserve slow orbital motion, individual particle drift, the gold core and violet outer dust.
- Do keep the canvas free of visible text and overlays.
- Do retain offline assets and the SDK lifecycle when changing the renderer.
- Don't compensate for portrait cropping by shrinking the entire desktop composition.

## Maintenance and validation

The source of truth is `templates/stellar-drift/scene.js`, maintained directly rather than generated. `index.html` owns the background, point fragment shader and fallback markup; `manifest.json` owns gallery metadata and settings. Keep the manifest defaults and renderer defaults aligned. General package and distribution guidance remains in `docs/template-artwork.md`.

Capture and check this wallpaper with the existing Edge/Playwright tool:

```powershell
$previewTools = Join-Path $env:TEMP 'seewallpaper-visual-check'
npm install --prefix $previewTools playwright
node build/capture-template-previews.mjs $previewTools stellar-drift
```

The command writes the gallery `preview.jpg`, desktop and portrait captures in `build/visual-review`, and the contact sheet. It checks browser errors, visible setting changes, pause/resume, economical-profile resume and horizontal overflow. `?preview=12` freezes a deterministic frame for captures; the regular URL animates.

Desktop visual finish was accepted by the scoped reviewer, with portrait cropping accepted. Browser checks do not establish live WebView2 desktop attachment, hardware GPU usage, context-restoration behavior or actual host-driven visibility events. Validate those in the installed Windows application when releasing; run `build/publish-latest.ps1` to include the package in the distribution.
