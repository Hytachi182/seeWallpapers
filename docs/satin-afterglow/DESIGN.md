---
name: Satin Afterglow
description: Original adult manga fashion glamour with quiet twilight atmosphere.
colors:
  plum-fallback: "#322434"
  rose-petal: "#b75b7c"
  warm-glimmer: "#ffe5bb"
---

# Design System: Satin Afterglow

## Overview

**Creative North Star: "Satin Afterglow"**

This record applies only to this wallpaper theme. A mature adult woman in an opaque asymmetric burgundy evening dress sits on a rose-framed terrace above a fictional twilight city. The mood is restrained fashion glamour; the illustration remains steady while the atmosphere moves.

**Key Characteristics:**

- Full-bleed painted manga illustration.
- Mature, fully clothed evening fashion.
- Quiet atmospheric animation and offline rendering.

The raster was generated for this theme. Keep the [generation prompt](artwork-prompt.txt) and [provenance record](../satin-afterglow.md#artwork-provenance). They document creation, not legal clearance.

## Colors

### Primary

- **Rose petal:** the drifting accent echoes the terrace flowers.
- **Warm glimmer:** small stars echo the amber lantern light.

### Neutral

- **Plum fallback:** the background behind the artwork while it loads.
- The raster supplies burgundy satin, plum shadows, rose-gold twilight and warm amber light. These observed image colors are not separate UI tokens.

## Typography

There is no visible text ramp, HUD or font asset. Setting labels belong to the established host application.

## Layout

**The Face-Preserving Crop Rule.** Use a full-viewport cover crop positioned at 66% horizontally and 50% vertically. Desktop retains the quiet city to the left and seated figure to the right; portrait retains the face and most of the seated figure while cropping peripheral scenery.

The canvas has no margins or scrollbars. Render dimensions are bounded to 1920 pixels wide and 1080 pixels high. Review the [desktop](../../build/visual-review/satin-afterglow-desktop.png) and [portrait](../../build/visual-review/satin-afterglow-mobile.png) captures when changing the asset or crop.

## Elevation & Depth

The raster's overlapping plants, chair, terrace rail and distant city convey depth without CSS shadows. Three petal depths share a gust-driven drift. Small flame silhouettes flicker at the painted candle positions, with restrained local illumination; distant haze and tiny sky glimmers complete the setting.

**The Stable Figure Rule.** Keep the face, body and clothing undeformed. Animate the surrounding atmosphere.

## Components

### Offline scene

A single image-backed Canvas surface carries an accessible image description. The manifest exposes speed, petal density, haze, lights and stars through the existing `window.seeWallpaper` SDK. The scene adds no local controls or audio.

Respect host pause/resume, visibility and FPS changes. Animation defaults to 30 FPS, with host rates clamped to 1–60 FPS. Reduced motion and speed zero show the unmodified illustration. Keep assets local, without external libraries, fonts or network requests.

The [verification and packaging instructions](../satin-afterglow.md#verification-and-packaging) describe the checks. The shared offline motion helper is bundled as `motion.js`. Its requestAnimationFrame clock accumulates elapsed time once and respects the host frame-rate budget. Deterministic desktop/portrait captures and figure-stability checks cover the refinement; they do not establish subjective continuous-playback quality or physical desktop performance.

## Do's and Don'ts

### Do:

- **Do** preserve the mature face and fully clothed fashion presentation.
- **Do** keep motion restrained and respect host lifecycle and reduced motion.
- **Do** retain the prompt and provenance record with the original raster.

### Don't:

- **Don't** add nudity, sexual action, franchise imagery or a HUD.
- **Don't** deform the figure or clothing to create motion.
- **Don't** describe generation provenance as legal clearance.
