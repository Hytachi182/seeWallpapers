---
name: Galactic Battle
description: Cinematic orbital combat over a blue planet, within the existing wallpaper catalogue.
colors:
  space: "#030a15"
  fallback-text: "#e4f2ff"
  fallback-panel: "#101c2dee"
  selection: "#8fc9ff"
  fighter-laser-glow: "#ff6548"
  enemy-laser-glow: "#65ff78"
typography:
  body:
    fontFamily: "Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
components:
  artwork-error:
    backgroundColor: "{colors.fallback-panel}"
    textColor: "{colors.fallback-text}"
    typography: "{typography.body}"
    padding: "14px 18px"
---

# Design System: Galactic Battle

## Overview

**Creative North Star: "A Fixed View of an Orbital Battle"**

Galactic Battle 1.1.0 is a narrow Cinematic gallery theme extension using the existing manifest, host controls, preview and offline package architecture. Its world is photographic and cinematic: a copper-and-teal toroidal cruiser with offset habitat drums, blue planetary atmosphere and warm upper-left sunlight anchor moving spacecraft. The cruiser and planet remain stable while ceramic interceptors, asymmetric raiders, laser salvos and local bursts provide activity.

**Key Characteristics:**

- Generated photographic backdrop and transparent spacecraft sprites.
- Clear light-fighter and dark-adversary silhouettes at several apparent distances.
- Bounded layered motion with a stable viewpoint.
- Offline rendering and existing host controls.

## Colors

### Primary

The blue planetary limb and cyan engine light establish the cool orbital atmosphere; warm sunlight and orange bursts provide localized warmth. These photographic colors belong to the imagery rather than a new application palette.

### Secondary

Red laser glow identifies light fighters; green identifies dark adversaries. White bolt cores maintain visibility against the dark backdrop. This distinction is supported by different ship silhouettes.

### Neutral

Space supplies the page fallback. Pale fallback text and a dark translucent error panel provide readable recovery guidance if an asset fails to load.

## Typography

The wallpaper has no persistent text or HUD. The sole text component is the artwork-load error, using the body role above. Gallery titles and settings retain the existing product typography.

## Layout

The canvas fills the viewport without scrolling. The backdrop uses centered cover scaling: desktop shows the open-ring cruiser and planetary arc; portrait crops the sides, retaining part of the cruiser and atmosphere. Ship paths use viewport coordinates so actors traverse both aspect ratios. The error panel sits above the lower edge with margins (24px).

The backing canvas caps at 2,073,600 pixels, reduced to 921,600 at 15 FPS or below; device pixel ratio caps at 1.5. This bounds rendering cost independently of display resolution.

## Elevation & Depth

Photographic lighting, sprite size and drawing smaller ships first convey distance. Two cached radial glow textures supply blue engine light and orange explosion light; screen compositing and short laser glows keep illumination local. The capital ship is a backdrop element and the camera does not move.

**The Stable View Rule.** Preserve the cruiser and planet viewpoint while animating the foreground actors.

## Shapes

Retain the generated spacecraft silhouettes and transparent sprite margins. The capital cruiser has a thick open ring, offset cylindrical habitat drums and exposed curved ribs in copper, oxidized teal and ivory. The light interceptor has a broad curved ceramic body, unequal rounded swept tips and one turquoise exhaust slot. The dark raider has three offset flattened oval nacelles joined by curved copper arms, with an inset rectangular cockpit window. Small strokes describe bolts, sparks and debris. The error panel is rectangular.

## Components

### Orbital scene

Nine fixed actor definitions comprise six curved ceramic interceptors and three asymmetric oval-nacelle raiders. The scene bounds are 27 laser slots, four burst sites with 28 sparks each (112 total), 40 debris particles and 70 scintillating stars. Bolts use their ship's position at launch time. The two cached glow textures avoid rebuilding gradients each frame.

### Host settings and motion

Animation speed spans 0–2 and battle light intensity 0.3–1.6, both defaulting to 1. Fighters, engines, lasers, explosions, stars and debris are independently exposed; all default on. The blue engine glow aligns with each light interceptor's single rear exhaust slot. Speed zero freezes the whole scene. Deterministic preview time and reduced motion open a still frame. Pause and hidden pages stop the single timer/RAF loop, and changing the FPS profile preserves pause.

### Artwork error

Keep the background fallback and readable instruction: “The scene artwork could not be loaded. Reinstall this wallpaper to restore it.” The error appears only on image failure.

### Assets and shipped evidence

The background and both sprites were independently generated for this version around distinct ring, curved-body and asymmetric nacelle designs. Exact generation prompts are preserved in [background-prompt.txt](background-prompt.txt), [fighter-prompt.txt](fighter-prompt.txt) and [enemy-prompt.txt](enemy-prompt.txt), and embedded in image metadata. The background was encoded as JPEG from the generated bitmap; sprites retain PNG alpha. The prompts establish frozen camera composition, matching warm upper-left light, clean spacecraft margins and no baked-in combat effects. Generation provenance does not establish legal clearance or guarantee third-party rights.

The seven-file offline package is `manifest.json`, `index.html`, `scene.js`, `background.jpg`, `fighter.png`, `enemy.png` and `preview.jpg`. The preview is an actual Edge render. Source and operational commands are documented in [galactic-battle.md](../galactic-battle.md).

Visual review used [desktop](../../build/visual-review/galactic-battle-desktop.png), [portrait](../../build/visual-review/galactic-battle-mobile.png), and captured video [frame 2](../../build/visual-review/galactic-battle-original-frame-2.png) / [frame 7](../../build/visual-review/galactic-battle-original-frame-7.png). Motion captures are available as [MP4](../../build/visual-review/galactic-battle-original-motion.mp4) and [WebM](../../build/visual-review/galactic-battle-original-motion.webm); the MP4 lasts 10.56 seconds. The reviewer found no blocking silhouette or integration issue; that visual finding is not legal clearance. Frames establish appearance and changed actor positions; continuous video playback was not assessed by that visual review. Browser checks verified motion, pause, reduced motion, speed zero and offline use. Compilation and 63 template checks passed. The package passed CRC and byte-equality checks; installed version 1.1.0 matched all seven source-file hashes and appeared in the running WPF gallery search. Physical-monitor frame rate and Windows desktop attachment remain outside this evidence.

## Do's and Don'ts

### Do:

- **Do** preserve photographic lighting, sprite alpha and recognizable spacecraft silhouettes.
- **Do** retain the stable cruiser viewpoint and centered cover crop across aspect ratios.
- **Do** keep actor counts, cached glow textures and canvas pixel budgets bounded.
- **Do** preserve still-frame, pause and offline behavior through the existing host contract.

### Don't:

- **Don't** add baked-in laser beams, explosions or fighters to the backdrop.
- **Don't** add persistent HUD, audio or network dependencies to this theme.
- **Don't** promote this theme's palette or composition into root product design rules.
