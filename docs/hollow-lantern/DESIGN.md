---
name: Hollow Lantern
description: Original friendly Halloween ghost with cloth flutter and flying bats.
colors:
  violet-fallback: "#25213b"
---

# Design System: Hollow Lantern

## Overview

**Creative North Star: "Hollow Lantern"**

This record applies only to Hollow Lantern. An original friendly ghost floats through a violet moonlit clearing beneath a crooked manor, with warm carved pumpkins and autumn foliage. The independent transparent character supplies visible motion while the painted background keeps its composition and texture.

**Key Characteristics:**

- Original friendly eerie Halloween imagery without gore.
- Independent floating ghost and animated flying bats.
- Offline scene with host-controlled motion.

Preserve the [background prompt](background-prompt.txt), [ghost prompt](ghost-prompt.txt) and [provenance record](../hollow-lantern.md#artwork-provenance). The background and ghost were generated independently; those records document origin without promising legal clearance.

## Colors

### Neutral

- **Violet fallback:** the dark loading background behind the image.
- Painted assets supply indigo shadows, violet moonlight, ivory cloth and warm amber pumpkins. These observed material colors are not independent UI tokens.

## Typography

No text overlay, HUD or font asset ships in this scene. Settings labels belong to the host application.

## Layout

**The Clearing Flight Rule.** Cover-crop the background independently while ghost and bats follow viewport paths. Keep the ghost near the center on portrait screens and retain its complete silhouette.

The full-viewport canvas has no margins or scrollbars. Its render surface is bounded to 1920 pixels wide and 1080 pixels high. Portrait narrows ghost travel; surrounding manor and pumpkin scenery may leave the cover crop. Review the [desktop](../../build/visual-review/hollow-lantern-desktop.png) and [portrait](../../build/visual-review/hollow-lantern-mobile.png) captures when changing placement or scale.

## Elevation & Depth

The raster supplies manor, path, foliage and valley depth. The ghost follows a slow horizontal oscillation with separate vertical bobbing and restrained rigid rotation. Its lower cloth flutters while the face remains stable. Seven original filled bat silhouettes cross the upper sky with independent wing phases. Calibrated glow follows painted pumpkin faces; low mist and gust-driven autumn leaves complete the scene.

**The Rigid Face Rule.** Keep the ghost face and upper cloth rigid. Compose lower-cloth flutter on integer offscreen rows before rotating the complete character, avoiding overlapping translucent strip bands.

## Components

### Offline apparition scene

An image-backed Canvas surface carries an accessible scene description. Settings expose speed, ghost visibility, bats, pumpkin lights, ground mist and leaves. Speed zero and reduced motion freeze the complete composition.

The bundled `motion.js` helper supplies one requestAnimationFrame clock, defaulting to 30 FPS and following host budgets clamped to 1-60 FPS. Pause and hidden-document suspension stop the loop. Assets remain local, without audio or network dependencies.

Five final captured frames show distinct ghost and bat positions, preserved facial geometry and an unbroken cloth silhouette. These frames do not establish subjective continuous-playback smoothness or physical desktop performance. See the [packaging and checks](../hollow-lantern.md#packaging-and-checks).

## Do's and Don'ts

### Do:

- **Do** keep ghost motion independent of bats, mist, leaves and pumpkin glow.
- **Do** preserve the original prompts and artwork provenance.
- **Do** honor pause, visibility, reduced motion and host frame-rate changes.

### Don't:

- **Don't** distort the ghost face or introduce cloth strip banding.
- **Don't** add gore, franchise characters, logos or a HUD.
- **Don't** present generated-asset provenance as legal clearance.
