---
name: Stratos Flight
description: Original fictional combat jets traverse a blue-and-gold cloud sea.
colors:
  sky-fallback: "#263d56"
---

# Design System: Stratos Flight

## Overview

**Creative North Star: "Stratos Flight"**

This record applies only to Stratos Flight. Original fictional combat jets cross a blue-and-gold cloud sea in close and distant formations. A photographic cloud background, separate transparent aircraft and independently drifting vapor supply the material depth; rigid airframes carry the motion.

**Key Characteristics:**

- Photographic original background and true-alpha sprites.
- Visible aircraft traversal with gentle banking.
- Offline scene with host-controlled motion.

Preserve the [background prompt](background-prompt.txt), [jet prompt](jet-prompt.txt), [vapor prompt](cloud-prompt.txt) and [provenance record](../stratos-flight.md#artwork-provenance). The three assets were generated independently; these records document their origin without promising legal clearance.

## Colors

### Neutral

- **Sky fallback:** the dark blue loading background behind the image.
- The image assets supply blue atmospheric shadows, graphite metal, silver panels and amber sunlit edges. Their observed colors are not independent UI tokens.

## Typography

No text overlay, HUD or font asset ships in this scene. Settings labels belong to the host application.

## Layout

**The Viewport Flight Rule.** Cover-crop the background independently while aircraft paths follow the viewport. Aircraft and vapor wrap after leaving view; do not connect contrails across a flight-path reset.

The full-viewport canvas has no margins or scrollbars. Its render surface is bounded to 1920 pixels wide and 1080 pixels high. Portrait uses larger aircraft relative to viewport width, retaining readable silhouettes. Review the [desktop](../../build/visual-review/stratos-flight-desktop.png) and [portrait](../../build/visual-review/stratos-flight-mobile.png) captures when changing paths or scale.

## Elevation & Depth

Two formations share a 26-second route, offset by half a cycle. The distant group uses smaller, lower-opacity aircraft; wingmen use fixed formation offsets. Gentle bank changes and a shallow curved vertical route reinforce traversal. Twin contrails trace earlier engine positions and widen while fading with age. Restrained warm exhaust follows the same anchors. Separately drifting translucent vapor crosses the foreground.

**The Rigid Airframe Rule.** Translate, uniformly scale and rotate the transparent aircraft sprite; preserve its wing, cockpit and tail geometry. Attach exhaust and contrails to the same transformed engine anchors.

## Components

### Offline flight scene

An image-backed Canvas surface carries an accessible scene description. Settings expose flight speed, formation wingmen, contrails, engine exhaust, foreground vapor and banking. Switching off wingmen retains both formation leaders. Speed zero and reduced motion freeze the composition; they do not remove the aircraft.

The bundled `motion.js` helper supplies one requestAnimationFrame clock, defaulting to 30 FPS and following host budgets clamped to 1-60 FPS. Pause and document visibility stop the loop. Assets remain local, without audio or network dependencies.

Seven captured frames across a live cycle establish distinct aircraft positions, stable geometry and inspected trail placement. These frames do not establish subjective continuous-playback smoothness or physical desktop frame-time performance. See the [packaging and checks](../stratos-flight.md#packaging-and-checks).

## Do's and Don'ts

### Do:

- **Do** keep aircraft motion visible independently of trails, exhaust and vapor.
- **Do** preserve original prompts and artwork provenance.
- **Do** honor pause, visibility, reduced motion and host frame-rate changes.

### Don't:

- **Don't** stretch or deform the aircraft to imitate banking.
- **Don't** add real-unit markings, branded designs or a HUD.
- **Don't** present generated-asset provenance as legal clearance.
