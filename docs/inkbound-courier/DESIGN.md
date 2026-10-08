---
name: Inkbound Courier
description: Original manga rooftop illustration with quiet atmospheric animation.
colors:
  vermilion: "#b64034"
  paper-fallback: "#eee4ce"
---

# Design System: Inkbound Courier

## Overview

**Creative North Star: "Inkbound Courier"**

This document describes this local wallpaper theme only. A detailed adult messenger sits above a fictional coastal town, with fine ink hatching, paper texture and restrained vermilion accents. The illustration remains stable while the surrounding atmosphere moves.

**Key Characteristics:**

- Full-bleed raster illustration.
- Quiet motion around a stable character.
- Offline rendering with host-controlled settings.

The original raster was generated for this theme. Preserve the [generation prompt](artwork-prompt.txt) and [provenance record](../inkbound-courier.md#artwork-provenance); they document the process without promising legal clearance.

## Colors

### Primary

- **Vermilion:** tumbling petals and the selection accent echo the scarf and flowers in the illustration.

### Neutral

- **Paper fallback:** the background behind the artwork while it loads.
- The visible illustration combines midnight ink, warm ivory architecture, ochre window light and terracotta roofs. These are observed image colors, not separately defined UI tokens.

## Typography

There is no visible type ramp, text overlay or HUD. Settings labels belong to the existing host application; this theme adds no font assets.

## Layout

**The Face-Preserving Crop Rule.** Fill the viewport with a cover crop positioned at 65% horizontally and 50% vertically. Desktop retains the bay and messenger; portrait retains the face and seated pose while cropping peripheral scenery.

The canvas fills the viewport without margins or scrollbars. Render dimensions are capped independently at 1920 pixels wide and 1080 pixels high, with device pixel ratio bounded accordingly. Inspect the [desktop](../../build/visual-review/inkbound-courier-desktop.png) and [portrait](../../build/visual-review/inkbound-courier-mobile.png) captures when changing the asset or crop.

## Elevation & Depth

Depth comes from the raster's layered rooftops, harbor and mountains, not CSS shadows. Three petal depths, faint sky trails, harbor-local mist and small window glows add atmosphere without replacing the illustrated materials.

**The Stable Illustration Rule.** Keep the character, clothing, scarf and buildings undeformed. Motion belongs to the atmospheric overlays.

## Components

### Offline scene

The scene is a single image-backed Canvas surface with an accessible image description. It has no local controls. Speed, petal density, mist, lights and wind are exposed through the template manifest and `window.seeWallpaper` SDK.

Respect host pause/resume, visibility and FPS changes. The default animation rate is 30 FPS; host rates are clamped to 1–60 FPS. Reduced motion and speed zero render the unmodified illustration. Avoid external fonts, libraries and network assets.

Validation scripts and their invocation are recorded in [Build and verification](../inkbound-courier.md#build-and-verification). They cover desktop/portrait settings and lifecycle, stable character pixels, reduced motion, speed zero, long-running deterministic previews, the 4K rendering budget and offline loading. Browser checks do not establish performance on every GPU or real desktop attachment.

The 2026-10-08 delivery checks passed those browser cases and all 57 manifest-validator tests. Package CRC and file equality were verified; the five installed template files matched SHA256 hashes. Both rasters carried provenance metadata. Actual desktop attachment and frame-time performance remain unmeasured.

## Do's and Don'ts

### Do:

- **Do** preserve the face in portrait crops.
- **Do** keep animation restrained and controlled by host lifecycle and reduced motion.
- **Do** retain the prompt and provenance record with the original artwork.

### Don't:

- **Don't** add a HUD or deform the character illustration.
- **Don't** substitute existing franchise imagery, manga scans or downloaded music.
- **Don't** present generation provenance as a legal guarantee.
