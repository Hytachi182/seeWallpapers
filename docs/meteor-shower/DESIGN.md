---
name: seeWallpaper Meteor Shower
description: Original Milky Way photography with fine autonomous meteor light.
colors:
  meteor-tint: "#d9e9ff"
  fallback-background: "#080e18"
  fallback-message: "#080e18e8"
  fallback-text: "#e4ecf5"
  hot-core: "rgba(255,253,244,1)"
  warm-fireball: "rgba(255,233,196,1)"
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

# Design System: Meteor Shower

## Overview

A photographic Milky Way above a dark alpine lake provides the quiet setting for an ultra-realistic meteor-shower direction. Fine procedural light cores cross the sky from a shared offscreen radiant, with restrained bloom, occasional warmer fireballs and fading atmospheric trains. The original Imagegen background contains no static shooting stars; every moving meteor is code-drawn.

## Colors

The photograph owns the natural night-sky palette and mountain/lake silhouette. The default host tint is `#d9e9ff`; tiny near-white cores and occasional warm fireball catches provide localized contrast. Keep the sky dark enough to preserve the photographic atmosphere. Fallback colors are recorded above; shader-like glow opacity varies with brightness and passage age rather than introducing new solid surfaces.

## Typography

The scene has no text, HUD or embedded controls. A photograph-load error uses 14px/1.5 Segoe UI with a sans-serif fallback, explaining that reinstalling the wallpaper restores the image.

## Layout

Fill the viewport with a centered photographic cover crop, including portrait views. Canvas fills the page with hidden overflow. Moving lights adapt to the viewport ratio and are clipped above the photograph's horizon. The backing canvas respects a 2,073,600-pixel budget, reduced to 921,600 at 15 FPS and below; device pixel ratio is capped at 1.5.

The static fallback uses the same centered cover crop. Its error paragraph is inset 24px from the left, right and bottom, with 14px 18px padding and square corners. Settings remain in the host.

## Elevation & Depth

Depth comes from the photographic stars, Milky Way and silhouette, plus very fine tapered meteor trails drawn with screen blending. A small white-hot head, weak surrounding bloom and occasional warm fragments distinguish fireballs. Atmospheric trains drift subtly and fade quadratically. Scintillation remains restrained; no UI shadows are used.

## Shapes

Meteor heads and tails align to the display aspect ratio. Round-capped luminous cores taper through gradients from a transparent tail to a bright head. Core width is subpixel or narrow at desktop scale; glow remains localized. A shared normalized radiant at (-0.35, -0.65) gives the shower consistent perspective.

## Components

- **Photographic background:** original generated Milky Way, alpine mountains and lake, bundled as `background.jpg`.
- **Meteor layer:** autonomous Canvas 2D passages, bounded to 18 active meteors and 48 lingering trains; 115 subtle scintillation points. Host settings control density, speed, brightness, tint, trains and twinkle.
- **Lifecycle:** fixed 1/120-second simulation steps, default 30 FPS, host pause/resume and visibility support. Reduced motion opens a still passage and caps the host FPS limit at 15. Deterministic `?preview=6.1` captures the first bright meteor.
- **Offline bundle:** five archive-root files: `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `preview.jpg`. No external fonts or network dependencies.

## Do's and Don'ts

- **Do** preserve fine cores, restrained bloom, subtle stars and full viewport photographic coverage.
- **Do** edit simulation, rendering and lifecycle in `templates/meteor-shower/scene.js`; layout/fallback belong to `index.html`, settings to `manifest.json`.
- **Do** keep generated image provenance in `docs/meteor-shower/background-prompt.txt` and JPEG metadata, and use existing capture/package checks after changes.
- **Don't** add a HUD or settings controls inside the wallpaper, or bake shooting stars into the photograph.
- **Don't** present the artistic simulation as a real observation or a date/location-specific forecast.

Source and validation guidance: `../meteor-shower.md`. The catalogue preview samples the bright meteor at 6.1 seconds.
