---
name: seeWallpaper Automatic Pixel Worlds
description: Original offline scenes extending the existing Canvas Games collection.
colors:
  letterbox: "#111d2d"
  progress-surface: "#0c1729e8"
  progress-text: "#f6e9ce"
  sprite-metal: "#bac5bd"
  sprite-skin: "#ecc594"
  sprite-detail: "#142d3a"
  sprite-boots: "#384b56"
  defender-accent: "#80dfce"
  defender-sky: "#0e182c"
  castle-accent: "#d99a78"
  castle-sky: "#263343"
  city-accent: "#f3cf91"
  city-day: "#99b1b7"
  city-night: "#263854"
  dungeon-accent: "#bba4e7"
  dungeon-background: "#171b28"
  island-accent: "#d8866d"
  island-water: "#2e6678"
  factory-accent: "#86ded0"
  factory-background: "#202c3a"
  climber-accent: "#e9b878"
  climber-sky: "#253345"
typography:
  label:
    fontFamily: "monospace"
    fontSize: "9px"
  station-label:
    fontFamily: "monospace"
    fontSize: "8px"
components:
  progress-strip:
    backgroundColor: "{colors.progress-surface}"
    textColor: "{colors.progress-text}"
    typography: "{typography.label}"
    width: "608px"
    height: "28px"
---

# Design System: Automatic Pixel Worlds

## Overview

The visual direction extends the existing self-playing Canvas Games world: original tiny characters, recognizable environments and restrained thematic palettes. The scene is the wallpaper; a compact optional progress strip provides context without demanding interaction. This document applies to the seven pixel themes, not the application's wider identity.

## Colors

Each theme uses its default accent for active machinery, characters, roofs, crystals or progress indicators. The host's Scene accent setting replaces that accent. Keep environment colors local to each scene in `build/pixel-worlds.js`; the frontmatter records shared sprite colors, principal backgrounds and default accents, rather than every incidental scenery shade.

Cool navy and teal structure Pixel Defender and Robot Factory. Castle Raid and Tower Climber pair muted stone with warm accents. Tiny City shifts between pale daytime and navy nighttime skies. Dungeon Loop uses dark stone with a lavender accent; Pixel Island combines teal water, sand and green terraces with coral roofs.

## Typography

Canvas text uses the system `monospace` family, with a top baseline. Progress titles are uppercase at 9 logical pixels, left aligned; their 9-pixel detail text aligns to the right. Factory station names use 8 pixels. No fonts are downloaded. These sizes belong to the logical scene and scale with it.

## Layout

Compose every scene within a 640 × 360 logical canvas. Fit and center the whole scene, with `#111d2d` letterboxing where necessary; retain all scene content instead of cropping. The backing canvas height is 360, and its width follows the viewport ratio within 160–1920. Disable canvas smoothing and use CSS `image-rendering: pixelated`.

The progress strip sits at (16, 15), measures 608 × 28, and places text at y=24, with left x=26 and right x=614. The strip can be hidden through Show simulation progress. Portrait displays intentionally show a smaller complete scene; this shipped direction prioritizes desktop composition.

## Elevation & Depth

Depth comes from silhouettes, darker background layers, masonry seams, ground edges and small highlights. Pixel scenery uses flat fills and occasional transparency for rain, particles and city lighting. There are no CSS shadows or elevated UI cards.

## Shapes

Small original sprites are encoded as character grids. Rectangles round drawing coordinates and dimensions; stepped mountains, clouds, shorelines and roofs keep the pixel geometry visible. Sprite scaling is local to the scene. The progress strip has square corners.

## Components

- **Scene canvas:** full viewport, overflow hidden, opaque Canvas 2D context. Each simulation draws within the clipped logical scene.
- **Sprites and environment:** code-drawn people, knights, drones, trees, crystals and machinery; no external artwork or network requests.
- **Progress strip:** optional title plus theme-specific live counters. It reports simulation state and is not an interactive control.
- **Effects:** optional action sparks and ambient pixels; Tiny City's particles option also controls rain. Spark count is capped at 100.
- **Lifecycle:** fixed 1/60-second simulation steps, speed 0.3–2, default render limit 30 FPS and host limits clamped to 1–60. Host pause and hidden documents stop scheduling; resume and visibility changes restart when allowed. Reduced motion initially renders a still scene; explicit host resume starts motion. Settings apply without restarting the theme.
- **Offline package:** each generated theme ships `manifest.json`, `index.html`, `scene.js` and `preview.jpg` at its `.seewall` archive root. The manifest declares Games, web engine, low performance and the four settings.

## Do's and Don'ts

- **Do** edit the shared source `build/pixel-worlds.js` and regenerate the seven template folders with `build/generate-pixel-worlds.mjs`. The generator owns theme metadata, accent defaults and the HTML wrapper.
- **Do** preserve autonomous progress, bounded actors/effects, offline execution and host lifecycle support.
- **Do** capture previews and run the existing simulation/package checks after scene changes; see `../pixel-worlds.md` for commands.
- **Don't** introduce a new application identity for this scoped collection or require keyboard input for its wallpaper loops.
- **Don't** crop portrait scenes, add downloaded fonts/assets, or hand-maintain generated `scene.js` copies.
