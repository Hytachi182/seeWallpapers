---
name: Moonlit Dunes
description: Theme-scoped animation record after the catalogue motion audit.
---

# Design System: Moonlit Dunes

## Overview

**Creative North Star: "Moonlit Dunes"**

Layered moonlit sand ridges beneath a dark crescent sky.

The original local shader supplies the scene; no new image assets were introduced.

## Typography

No new text overlay or HUD is introduced.

## Layout

The shader fills the viewport; portrait retains the layered dunes while peripheral sky detail may leave view.

## Elevation & Depth

Procedural WebGL dunes with wind-driven sand streams and faster dust/ripple advection. Ridge geometry remains fixed.

**The Fixed Ridge Rule.** Animate sand shading, ripple phase and wind streams without moving dune silhouettes.

## Components

### Offline scene

Keep existing host settings, pause/resume, visibility and frame-rate controls. Reduced motion and speed zero suspend animation. All assets remain local.

The [catalogue motion audit](../motion-audit.md) records short-window pixel changes, a screening heuristic rather than a quality or FPS measure. Desktop/portrait captures establish inspected composition; continuous playback and physical desktop performance were not reviewed.

## Do's and Don'ts

- **Do** preserve established scene materials and motion boundaries.
- **Don't** add whole-image zoom to inflate motion measurements.
