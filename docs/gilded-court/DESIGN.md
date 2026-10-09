---
name: Gilded Court
description: Original royal courtyard with articulated procession and layered material motion.
colors:
  marble-fallback: "#d7bc91"
---

# Design System: Gilded Court

## Overview

**Creative North Star: "Gilded Court"**

This record applies only to Gilded Court. An original sapphire-gowned adult sovereign moves before an ivory-and-gold palace while articulated guards cross the terrace. Painted marble, silk and armor supply the material world; character motion, cloth, water and restrained illumination animate it.

**Key Characteristics:**

- Original palace and adult sovereign with sapphire and gold materials.
- Independent procession, gown, banner and fountain animation.
- Offline scene with host-controlled motion.

Preserve the [palace prompt](background-prompt.txt), [sovereign prompt](sovereign-prompt.txt) and [asset provenance](../gilded-court.md#asset-provenance). Guards reuse the original [Emberwatch armor atlas](../emberwatch-knight.md#artwork-provenance), independently bundled here. These records document origin without promising legal clearance.

## Colors

### Neutral

- **Marble fallback:** the warm loading background behind the palace image.
- Painted assets supply ivory stone, gold trim, sapphire silk and worn steel. Banner gradients echo sapphire cloth with subdued gold edging; observed image colors are not independent UI tokens.

## Typography

No text overlay, HUD or font asset ships in this scene. Settings labels belong to the host application.

## Layout

**The Court Placement Rule.** Cover-crop the palace independently while foreground characters follow viewport coordinates. Attach banners to the painted poles and fountain effects to the painted basin and source.

The full-viewport canvas has no margins or scrollbars. Its render surface is bounded to 1920 pixels wide and 1080 pixels high. Portrait reduces sovereign travel and limits character size while the palace uses a centered cover crop. Review the [desktop](../../build/visual-review/gilded-court-desktop.png) and [portrait](../../build/visual-review/gilded-court-mobile.png) captures when changing placement.

## Elevation & Depth

The palace raster supplies architectural depth. Three smaller guards cross behind the sovereign on a 48-second viewport route; articulated arms and two-bone leg IK retain assembled armor. Soft contact shadows sit beneath the characters. The sovereign translates slowly while the lower gown waves. Attached banners use broad across-width fold lighting, shallow nonperiodic depth variation and restrained hem shading. Calibrated fountain droplets, basin refraction, palace illumination and petals complete the setting.

**The Planted Foot Rule.** Derive guard gait timing from stride length, viewport scale and procession velocity. Cancel world translation during grounded stance; return each lifted foot with a continuous swing.

**The Rigid Figure Rule.** Keep the sovereign face and upper body rigid. Compose gown flutter and banners on integer offscreen rows before placement; use broad cloth fold lighting without repeated opacity bands.

## Components

### Offline court scene

An image-backed Canvas surface carries an accessible scene description. Eight settings expose speed, guard procession, sovereign visibility, gown wind, banners, fountain, lights and petal density. Zero speed and reduced motion freeze the complete composition.

The bundled `motion.js` helper supplies one requestAnimationFrame clock, defaulting to 30 FPS and following host budgets clamped to 1-60 FPS. Pause and hidden-document suspension stop the loop. Assets remain local, without audio or network dependencies.

Final desktop/portrait captures show smooth broad banner folds without repeated horizontal bars. Source-level gait checks cover planted-foot world-coordinate cancellation and continuous lifted transitions. Captured frames establish movement and placement, not subjective continuous-playback smoothness or physical desktop performance. See the [package and validation instructions](../gilded-court.md#package-and-validation).

## Do's and Don'ts

### Do:

- **Do** keep articulated guard motion independent of the other animated elements.
- **Do** preserve original prompts and the reused armor provenance.
- **Do** honor pause, visibility, reduced motion and host frame-rate changes.

### Don't:

- **Don't** let planted feet slide or add repeated cloth strip bands.
- **Don't** deform the sovereign face or add real monarchy insignia, franchise motifs or a HUD.
- **Don't** present generated-asset provenance as legal clearance.
