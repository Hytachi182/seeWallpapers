---
name: Underwater Blue
description: A living photographic immersion in clear turquoise sea.
colors:
  sea-fallback: "#064869"
  marine-speck: "rgb(213,235,231)"
  recovery-surface: "#06334aee"
  recovery-text: "#e7f3f7"
typography:
  recovery:
    fontFamily: "'Segoe UI', sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
components:
  recovery-message:
    backgroundColor: "{colors.recovery-surface}"
    textColor: "{colors.recovery-text}"
    typography: "{typography.recovery}"
    padding: "14px 18px"
---

# Design System: Underwater Blue

## Overview

**Creative North Star: "Sunlit submerged life"**

A photographic sandy reef sets the scene. Swimming tropical fish, a distant shoal, rising bubble streams and current-borne particles make the water visibly alive while gentle optics sustain its calm blue atmosphere. The original Imagegen background supplies all terrain; a separate original transparent Imagegen fish supplies the animated marine life.

**Key Characteristics:**

- Photographic turquoise water, sand and reef.
- Visible swimming fish, beating tails and rising bubble streams.
- Restrained refraction, sun shafts and seabed-light filaments.
- Uninterrupted, silent immersion.

## Colors

The photograph owns the palette. Sea fallback fills unpainted space; marine speck tints the faint foreground particles. Recovery surface and recovery text appear only when rendering needs attention. Frontmatter records the implemented color values.

## Typography

The wallpaper has no normal text. A graphics-recovery message uses the system font and role recorded above; no font files load.

## Layout

Both canvases fill the viewport with no margins or scrolling. The photograph uses a centered cover crop on desktop and portrait. Recovery text sits 24px from the bottom and horizontal edges. Canvas backing resolution is capped per layer at 2,073,600 pixels, falling to 921,600 at 15 FPS and below.

## Elevation & Depth

Depth comes from the photograph, fish at different scales and opacities, suspended specks and directional sunlight, without UI shadows. Refraction mainly affects open water; seabed light is confined to the lower image. Keep rocks readable and fish and bubbles clearly moving.

## Components

The scene uses a WebGL photograph/light layer and a separate transparent Canvas 2D foreground with four larger fish swimming in both directions, an eight-fish distant shoal, 105 current-borne specks and 54 bubbles rising in three streams. Fish tails beat through 24 cached raster deformations (512 by 288 pixels), keeping the head stable and the source image unchanged. No objects accumulate during animation.

Host settings control speed, illumination, refraction, shafts, caustics and specks, with separate `fish`, `school` and `bubbleStreams` switches. All three marine-life switches default on; animation speed defaults to 1. The new `bubbleStreams` key deliberately ignores the former `bubbles: false` setting so saved defaults do not hide the visible bubbles.

Speed zero freezes scene time. Host pause and page visibility stop animation; reduced motion opens a still frame. WebGL context loss reveals the JPEG and hides the foreground, and restoration preserves scene time and pause state. No-WebGL recovery displays the same photograph with a short message.

The seven-file offline pack includes `fish.png`, the JPEG fallback and both images embedded in `background.js` for offline file-origin loading. Asset provenance and the exact background and fish prompts live alongside this document and in their image metadata; see [operational notes](../underwater-blue.md).

## Do's and Don'ts

- Do preserve the photographic reef, centered cover crop and calm blue atmosphere.
- Do keep fish swimming, tails beating and bubbles rising visibly by default.
- Do keep fish, bubbles and current-borne particles bounded, with cached tail animation.
- Do retain the static photograph during graphics recovery.
- Don't add a HUD, audio, human figures or network dependencies to this scene.
- Don't describe the artistic optics and marine animation as a physical simulation.
