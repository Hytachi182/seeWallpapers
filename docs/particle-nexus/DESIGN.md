---
name: Particle Nexus
description: Classic particles.js nodes and proximity links on a quiet dark field.
colors:
  primary: "#8cdcf0"
  background: "#08121c"
---

# Design System: Particle Nexus

## Overview

**Creative North Star: "A quiet constellation"**

Luminous nodes drift through generous dark space, joining with fine lines as they approach. The wallpaper is an ambient Canvas 2D scene without text or a HUD; settings belong to the existing wallpaper host.

**Key Characteristics:**
- Ice-cyan light against deep navy.
- Small circular nodes, subtle links and optional soft light.
- Autonomous drift with optional pointer connections.

## Colors

### Primary
- **Ice cyan:** shared by nodes, proximity links, pointer links and atmospheric light. The host exposes one configurable particle-and-link color.

### Neutral
- **Deep navy:** the configurable background. Two sparse radial washes use the current light color at low opacity.

## Layout

The scene fills the viewport without scrolling. Connection range scales with the shorter viewport side, capped at the desktop reference of 1080 CSS pixels, so portrait views remain legible. Resizing preserves particle count and scales existing positions.

## Elevation & Depth

Depth comes from particle size variation, translucent proximity links and optional radial particle light, not panels or surface shadows. Background washes sit at 75%/22% and 14%/85%, with opacities of 0.055 and 0.035.

## Shapes

Circular nodes have a randomized radius based on 2.7 CSS pixels, with an adapter floor of 0.75. Proximity links use a fine 0.65 CSS-pixel stroke and fade with distance. No typography, cards or in-scene controls are part of this theme.

## Components

### Particle field

The unmodified bundled particles.js 2.0.0 library owns particle construction and Canvas 2D drawing. `scene.js` owns settings, resizing, selected count, glow and animation scheduling; `index.html` owns the full-viewport container and background washes. Defaults are 110 particles, speed 0.7 and connection distance 210; host settings allow 35–180 particles, speed 0–2 and distance 80–320, plus links, glow and pointer toggles.

The adapter owns the sole timer/RAF schedule; the library's native RAF stays off. Host pause and hidden pages stop animation, pointer events do not redraw a paused frame, zero speed holds particle positions, and reduced motion opens a still frame. Backing pixels cap at 2,073,600, or 921,600 at 15 FPS and below.

Source provenance, MIT attribution, package contents and validation commands are recorded in [Particle Nexus documentation](../particle-nexus.md). The six-file offline package includes the upstream license.

## Do's and Don'ts

### Do:
- Do retain generous dark space and fine distance-faded links.
- Do preserve selected count across resizing and host pause across FPS changes.
- Do keep settings in the wallpaper host and bundle the library with its MIT license.

### Don't:
- Don't add a HUD or text overlay to the particle field.
- Don't enable the library's native animation loop alongside the host adapter.
- Don't treat pointer delivery behind desktop icons as guaranteed.
