---
name: Winter Snowfall
description: Photographic alpine blue hour with warm chalet windows and layered falling snow.
colors:
  cold-background: "#23384c"
  pale-snow: "#f2f6fa"
  recovery-text: "#e8eff5"
  recovery-surface: "#1a2d40ee"
typography:
  recovery:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
---

# Design System: Winter Snowfall

## Overview

**Creative North Star: "A Quiet Alpine Blue Hour"**

Ultra realistic animated snow falls over an original Imagegen winter photograph. The alpine forest, chalet and warm windows establish a calm photographic scene; movement belongs to snow suspended in front of the fixed image.

**Key Characteristics:**
- Cold blue hour with warm chalet windows.
- Three depths of irregular falling flakes.
- Soft foreground defocus and gentle wind flutter.
- An uninterrupted wallpaper without a HUD.

## Colors

Cold Background fills the scene before the photograph loads. Pale Snow colors the cached flakes. Amber light belongs to the photograph's windows, with no invented accent token. Recovery Text and Recovery Surface are reserved for the image-loading error.

## Typography

The wallpaper has no visible text during normal operation. The recovery message uses the frontmatter's Segoe UI role only when the background cannot load.

## Layout

Fill the viewport without scrolling. Keep the photograph fixed with a centered cover crop on desktop and portrait, retaining the chalet as the visual anchor. Snow coordinates scale with the viewport. The recovery message sits 24px from the lower and side edges with 14px by 18px padding.

**The Fixed Photograph Rule.** Keep the photographic background still; animate only the snowfall.

## Elevation & Depth

Depth comes from small slow distant flakes, fluttering midground flakes and larger nearby flakes. Three cached 64px square clump sprites provide crisp, soft and near-defocused snow; blur is prepared once, never filtered per frame. Smooth gusts influence signed wind. Edge feathering keeps recycling continuous. Snow does not accumulate on the photographed ground.

## Shapes

Flakes are tiny uneven clumps, with varied size and opacity. Preserve photographic irregularity and avoid decorative snowflake icons.

## Components

The scene is a full-viewport canvas with a photograph fallback. Host settings control intensity, speed including zero, signed wind, size, nearby flakes and photographic focus. Counts remain bounded at 71–890, with 356 at default intensity. Disabling nearby flakes hides the near layer.

Pause, visibility and FPS profiles control rendering. Reduced motion opens a still frame; zero speed freezes positions and light variation. Pixel backing caps at 2,073,600, or 921,600 at 15 FPS and below. The five-file offline package has no network dependency. Asset provenance and the exact generation prompt remain in [the wallpaper documentation](../winter-snowfall.md) and [background-prompt.txt](background-prompt.txt).

## Do's and Don'ts

### Do:
- Do preserve the original photograph and centered cover crop.
- Do keep three snowfall depths with varied clumps, drift and photographic defocus.
- Do honor pause, visibility, reduced motion and bounded rendering budgets.

### Don't:
- Don't add a HUD or normal-operation text overlay.
- Don't animate the photograph or accumulate snow on the ground.
- Don't replace clumps with decorative snowflake icons or add per-frame blur filters.
