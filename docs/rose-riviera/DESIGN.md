---
name: Rose Riviera
description: Original coastal fashion miniature with water, petals and candlelight motion.
colors:
  rose-fallback: "#f3b5bc"
  drifting-petal: "#dc739e"
---

# Design System: Rose Riviera

## Overview

**Creative North Star: "Rose Riviera"**

This record applies only to Rose Riviera. A rose-pink coastal villa, original adult fashion figurines and a pearlescent convertible overlook turquoise water at sunset. The original raster supplies the composition and material depth; motion belongs to water, petals, candlelight and a restrained lacquer highlight.

**Key Characteristics:**

- Full-bleed original raster miniature.
- Coherent water and material motion.
- Offline rendering with host-controlled lifecycle.

The [artwork provenance record](../rose-riviera.md) documents original ImageGen production without brands, logos, recognizable copyrighted characters or replicas of branded toys. Preserve that record; it is not a legal guarantee.

## Colors

### Primary

- **Drifting petal:** pink flower petals echo the bougainvillea.

### Neutral

- **Rose fallback:** the loading background behind the original image.
- The raster supplies champagne architecture, turquoise water and warm sunset light; these observed image colors are not independent UI tokens.

## Typography

The wallpaper carries no text overlay, HUD or font asset. Settings labels belong to the host application.

## Layout

**The Scene-Preserving Crop Rule.** Fill the viewport with a cover crop centered horizontally on landscape screens and positioned at 68% horizontally on portrait screens; keep the vertical crop centered.

The full-viewport canvas has no margins or scrollbars. Its render surface is bounded to 1920 pixels wide and 1080 pixels high. Review the [desktop](../../build/visual-review/rose-riviera-desktop.png) and [portrait](../../build/visual-review/rose-riviera-mobile.png) captures when changing the composition.

## Elevation & Depth

Depth comes from the painted miniature, foreground foliage, pool edge, coastal recession and glossy car. Source-pixel row refraction animates two independent water regions; coherent caustic lines reinforce the pool. Gust-driven petals carry three depths. Candle silhouettes flicker at existing lanterns, and a soft sheen travels across the car bonnet.

**The Stable Subjects Rule.** Keep figurines, architecture and the car undeformed. Clip source-row refraction to the pool and coastal water; clip the moving lacquer sheen to the bonnet.

## Components

### Offline scene

A single image-backed Canvas surface carries an accessible image description. Host settings expose speed, petal density, water, lights and glints. The existing glints control now governs the bonnet sheen.

The shared offline helper is bundled as `motion.js`. Its requestAnimationFrame clock accumulates elapsed time once, defaults to 30 FPS and follows the host budget clamped to 1-60 FPS. Pause, hidden-document suspension and reduced motion stop the loop. Reduced motion and speed zero show the unmodified image. Keep assets local.

Deterministic frame comparisons and desktop/portrait captures support placement review; they do not establish subjective continuous-playback quality or physical desktop frame-time performance. See the [theme verification instructions](../rose-riviera.md).

## Do's and Don'ts

### Do:

- **Do** keep water motion inside the illustrated water boundaries.
- **Do** preserve the original artwork and its provenance record.
- **Do** respect pause, visibility, reduced motion and speed zero.

### Don't:

- **Don't** add a HUD or deform the figurines, car or architecture.
- **Don't** substitute branded characters, logos or promotional artwork.
- **Don't** describe generation provenance as legal clearance.
