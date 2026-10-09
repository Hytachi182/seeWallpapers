---
name: Emberwatch Knight
description: Original modular armored knight with patrol and sword-practice animation.
colors:
  twilight-fallback: "#1f3037"
---

# Design System: Emberwatch Knight

## Overview

**Creative North Star: "Emberwatch Knight"**

This record applies only to Emberwatch Knight. An original armored knight patrols a twilight stone terrace, pauses in guard and practices controlled sword movements. Twelve transparent painted atlas pieces supply steel, brass and teal fabric; articulated joints supply character motion independently of the surrounding atmosphere.

**Key Characteristics:**

- Original cinematic courtyard and transparent modular armor.
- Visible patrol, guard, sword practice and idle poses.
- Offline scene with host-controlled motion.

Preserve the [background prompt](background-prompt.txt), [armor prompt](armor-prompt.txt) and [provenance record](../emberwatch-knight.md#artwork-provenance). These record independent original ImageGen assets without promising legal clearance.

## Colors

### Neutral

- **Twilight fallback:** the blue-green loading background behind the image.
- Painted assets supply worn steel, brass rivets, teal cloth, blue valley shadows and copper firelight. These observed material colors are not independent UI tokens.

## Typography

No text overlay, HUD or font asset ships in this scene. Settings labels belong to the host application.

## Layout

**The Terrace Patrol Rule.** Cover-crop the background independently while the knight follows viewport ground placement. Shorten the patrol span and scale the figure for portrait, retaining helmet, shield and sword.

The full-viewport canvas has no margins or scrollbars. Its render surface is bounded to 1920 pixels wide and 1080 pixels high. Ground placement follows 86% of viewport height; character scale is bounded by both height and width. Review the [desktop](../../build/visual-review/emberwatch-knight-desktop.png) and [portrait](../../build/visual-review/emberwatch-knight-mobile.png) captures when changing atlas assembly or scale.

## Elevation & Depth

The courtyard raster supplies layered stone, ivy, castle and valley depth. The knight is assembled from twelve alpha-backed painted components. Shoulder and elbow transforms move the arms, while two-bone leg IK follows alternating foot targets. The teal cape uses narrow source strips with motion increasing toward the hem and a stable upper attachment. Flames sit on the existing braziers, embers rise locally and faint mist remains in the valley.

**The Joined Armor Rule.** Keep atlas components assembled at their shoulder, elbow, hip and knee joints. Preserve the closed helmet and painted armor silhouettes; inspect atlas regions after any asset replacement.

## Components

### Offline articulated scene

An image-backed Canvas surface carries an accessible scene description. The 36-second routine repeats an 18-second passage: nine seconds of walking, two of guard, four of sword practice and three of idle; the second passage returns across the terrace. Disabling practice retains walking and idle motion. Settings also expose speed, cape flow, torch flames, mist and embers.

The bundled `motion.js` helper supplies one requestAnimationFrame clock, defaulting to 30 FPS and following host budgets clamped to 1-60 FPS. Pause, hidden-document suspension, speed zero and reduced motion stop the loop and retain a complete frozen composition. Assets remain local, without audio or network dependencies.

Nine captured frames establish distinct patrol positions and body poses, retained assembled armor and inspected effect placement. Sparse frames do not establish natural gait smoothness, continuous-playback quality or physical desktop performance. See the [package and verification instructions](../emberwatch-knight.md#package-and-verification).

## Do's and Don'ts

### Do:

- **Do** keep body-pose changes independent of flames, mist and embers.
- **Do** preserve the original prompts and artwork provenance.
- **Do** honor pause, visibility, reduced motion and host frame-rate changes.

### Don't:

- **Don't** leave isolated atlas fragments or crop neighboring components into a limb.
- **Don't** add franchise motifs, logos, real-world heraldry or a HUD.
- **Don't** present generated-asset provenance as legal clearance.
