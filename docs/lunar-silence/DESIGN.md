---
name: Lunar Silence
description: Theme-scoped animation record after the catalogue motion audit.
---

# Design System: Lunar Silence

## Overview

**Creative North Star: "Lunar Silence"**

A quiet blue-gray lunar landscape with an astronaut and stylized Earth.

Existing scene assets remain unchanged. The rover uses original code geometry, without a new downloaded or generated bitmap.

## Typography

No new text overlay or HUD is introduced.

## Layout

The existing 1920 by 1080 cover-fit world focuses portrait on world x=1340 near Earth and the astronaut; the rover path follows the visible width.

## Elevation & Depth

A small original Canvas rover follows a viewport route with rotating wheels and a blinking beacon. Earth surface scrolls faster; existing star, astronaut and dust motion remains.

**The Viewport Rover Rule.** Drive the rover within the visible viewport in portrait and landscape; rotate wheels with travel and preserve the astronaut composition.

## Components

### Offline scene

Keep existing host settings, pause/resume, visibility and frame-rate controls. Reduced motion and speed zero suspend animation. All assets remain local.

The [catalogue motion audit](../motion-audit.md) records short-window pixel changes, a screening heuristic rather than a quality or FPS measure. Desktop/portrait captures establish inspected composition; continuous playback and physical desktop performance were not reviewed.

## Do's and Don'ts

- **Do** preserve established scene materials and motion boundaries.
- **Don't** add whole-image zoom to inflate motion measurements.
