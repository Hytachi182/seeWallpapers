---
name: War Front
description: The supplied battle illustration with visible atmospheric battle activity.
colors:
  backdrop: "#18212a"
  recovery-text: "#f0e5d5"
  recovery-surface: "#17212bee"
  selection: "#efae6f"
  selection-text: "#17212b"
typography:
  recovery:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
---

# Design System: War Front

## Overview

**Creative North Star: "The supplied illustration, alive."**

The Cinematic identity comes from the user's `E:/Downloads/war_game_wallpaper.svg`: a burning harbour at sunset, foreground soldiers and airborne aircraft. This SVG contains one embedded PNG. `templates/war-front/artwork.svg` preserves it byte for byte; the theme adds environmental motion without regenerating the artwork. Provenance records the supplied source, not a claim of transferred copyright.

Visible smoke, flames, embers, tracer salvos and distant city explosions bring the battle to life. Activity remains attached to the painted harbour and sky; foreground soldiers and aircraft bodies stay fixed.

**Key Characteristics:**

- Fullbleed supplied artwork
- Visible atmospheric battle activity
- Protected silhouettes
- Offline host-controlled playback

## Colors

The artwork owns the palette. The backdrop supports loading; recovery text and surface appear only on load failure. Selection colors belong to selectable recovery text. Canvas light uses warm fire and pale exhaust with restrained `screen` blending; smoke reuses actual sky pixels.

## Typography

The scene has no titles or HUD. The only text is the recovery message, using the frontmatter's recovery role. Settings labels belong to the wallpaper host.

## Layout

One full-viewport canvas uses cover scaling from the original (1672 × 941). Matching desktop ratios retain the composition. Portrait horizontal overflow is positioned at 0.36 to retain the main soldier and adjacent harbour; other views use 0.5. Vertical positioning stays centred. No scrolling or interface gutters.

## Elevation & Depth

Depth comes from the existing painting, feathered sky smoke, additive light and harbour shimmer. Foreground silhouette clipping protects soldiers and the ruined wall from every effect, including broad light blooms. No UI shadows or raised surfaces.

## Components

The scene combines 20 overlapping smoke sheets from five cached sky-only crops, 12 fire sources with 84 flame tongues and 168 staggered rising embers, 18 frequent tracer paths, fixed aircraft with exhaust/rotor overlays, and 115 masked reflection strokes. Six distant impact sites add local flashes, 18 sparks each and rising smoke sampled from the supplied artwork. Aircraft bodies and foreground soldiers stay fixed.

Host settings expose speed (0–2), intensity (0–2), smoke, fires, tracers, aircraft, city explosions and water. City explosions are enabled by default and can be disabled. Zero speed freezes effect time; zero intensity draws only the source. Pause and hidden-page handling stop animation scheduling; resume restarts it. Reduced motion starts with a still frame. Preview time is deterministic and paused.

The backing canvas caps at 2,073,600 pixels, or 921,600 at 15 FPS and below; device pixel ratio caps at 1.5. Default playback is 30 FPS, with host profiles clamped to 1–60 FPS (1–15 under reduced motion). These are rendering bounds, not measured device performance.

The offline package contains exactly `manifest.json`, `index.html`, `scene.js`, `artwork.svg` and `preview.jpg`. `scene.js` owns effects, masks and lifecycle; the source artwork owns composition. Load failure retains the CSS image fallback and shows a reinstall message. No network, external fonts, audio or HUD.

Desktop and portrait review support shipping this visual revision without a material fix. Video frames at 2 and 7 seconds show stronger rendered changes; continuous playback was not inspected in that review. Isolated effect motion, pause/FPS, reduced motion, exact original heads/torso preservation, zero speed and zero intensity checks passed. These checks do not establish CPU/GPU performance or desktop attachment on the user's monitors.

## Do's and Don'ts

- **Do** preserve the supplied artwork and original silhouettes.
- **Do** keep visible battle activity local to smoke, flames, embers, distant tracers, city explosions, engines, rotors and water.
- **Do** retain host controls, offline packaging and bounded rendering.
- **Don't** move the whole painting, duplicate aircraft bodies or add interface overlays.
- **Don't** treat the preview as proof of CPU/GPU performance on every monitor.
