---
name: seeWallpaper Rain on Glass
description: Original photographic blue-hour scenery behind autonomous refracting water.
colors:
  reflection-tint: "#c9d5df"
  fallback-background: "#17222d"
  fallback-message: "#14202dee"
  fallback-text: "#f1f4f5"
  selection: "#d2dce2"
typography:
  fallback-body:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
components:
  fallback-paragraph:
    backgroundColor: "{colors.fallback-message}"
    textColor: "{colors.fallback-text}"
    typography: "{typography.fallback-body}"
    padding: "14px 18px"
---

# Design System: Rain on Glass

## Overview

This Nature wallpaper presents realistic droplets settling on a pane of glass, merging and flowing under gravity. Sharp varied foreground beads refract an original generated blue-hour city photograph: muted blue-grey sky, wet streets and restrained amber lights. The scene extends seeWallpaper's collection without introducing a separate application identity.

## Colors

The photograph owns the blue and amber environment palette. The default `#c9d5df` reflection tint colors curved reflections and subtly grades the glass; the host can change it. `#17222d` fills the page and fallback background. The fallback paragraph uses its own dark translucent surface and pale text. Do not flatten the photograph into invented palette swatches.

## Typography

The rendered wallpaper has no text. Only the graphics fallback uses 14px/1.5 Segoe UI with a sans-serif fallback. Its message describes recovery through graphics acceleration, reapplying the wallpaper or reinstalling its photograph, depending on the failure.

## Layout

Canvas and photograph fill the viewport edge to edge, with hidden overflow. The background uses a centered cover crop in desktop and portrait orientations; no letterboxing is introduced. Water simulation dimensions follow the viewport ratio while maintaining approximately 518,400 pixels. Render resolution is bounded separately.

The fallback photograph uses the same centered cover treatment. Its paragraph anchors 24px from the left, right and bottom edges, with 14px 18px padding and square corners. The theme has no HUD or embedded settings controls; all six settings live in the host.

## Elevation & Depth

Depth comes from a cached real blur of the distant photograph, sharper lenses inside droplets, height-field normals, refraction, curved reflections and small directional highlights. Drop rims darken subtly and a mild vignette settles the edges. Moving water leaves slender residue trails that fade over time. No UI shadows or elevated panels are used.

## Shapes

Fine round beads contrast with larger convex drops that elongate slightly as they run. Drops cling before sliding, absorb neighbors while conserving volume, and drain beyond the viewport. Trails have round caps and remain narrow relative to their source drops. Foreground water is simulated separately from the photograph.

## Components

- **Photograph:** original generated city image bundled locally; no foreground rain baked into the asset. Background softness is cached and recalculated when that setting changes.
- **Wet glass:** offline WebGL height-field shader; optional fading trails, varied droplets and fine beads. Host settings control rain, speed, refraction, softness, tint and trails.
- **Lifecycle:** fixed 1/60-second simulation steps; host pause/resume, visibility and FPS limits stop or restart scheduling. Reduced motion opens a still wet-glass frame. Context loss shows the photograph; restoration rebuilds graphics resources while retaining drops.
- **Fallback:** bundled photograph plus a concise recovery paragraph when animation cannot render.
- **Package:** `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `background.js` and `preview.jpg` at the archive root. The data URL in `background.js` supports safe texture upload through the host's file origin; the JPEG remains the static fallback.

## Do's and Don'ts

- **Do** preserve crisp foreground water, restrained reflections, cached background blur and full viewport coverage.
- **Do** edit simulation/lifecycle in `templates/rain-on-glass/scene.js` and shader/layout in `index.html`; regenerate `background.js` with `build/generate-rain-texture.mjs` when the photograph changes.
- **Do** retain offline execution and the bounded 420 drops, 1,200 fine beads and adaptive render budget.
- **Don't** add a HUD, embedded controls or downloaded fonts to the wallpaper.
- **Don't** treat the wallpaper as an overlay on application windows or a live desktop capture. It renders its own bundled photograph behind desktop icons.

Approved visual references: `build/visual-review/rain-on-glass-desktop.png` and `build/visual-review/rain-on-glass-mobile.png`. Source and validation guidance: `../rain-on-glass.md`.
