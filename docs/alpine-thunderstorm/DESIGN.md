---
name: Alpine Thunderstorm
description: Restrained photographic alpine weather with procedural rain and intra-cloud lightning.
colors:
  storm-background: "#172333"
  rain: "rgb(193, 211, 227)"
  lightning: "rgb(231, 242, 255)"
---

# Design System: Alpine Thunderstorm

## Overview

**Creative North Star: "The Alpine Storm Window"**

An original photographic alpine lake and distant village sit beneath heavy charcoal-blue clouds. Preserve the dim, readable landscape and small warm windows. Weather adds atmosphere without competing with the photograph. The wallpaper has no HUD or audio.

## Colors

The storm background is the dark fallback surface. Rain uses translucent cool gray-blue strokes; lightning uses a pale icy core with restrained cloud illumination and lake reflection. These colors are normative in the frontmatter; transparency creates their depth.

## Layout

The photograph stays fixed, centered and cropped with cover scaling in desktop and portrait. Canvas effects follow the same image coordinates where they touch the sky or lake; rain covers the viewport. Keep the central sky open and preserve the lake mask when changing the image.

## Elevation & Depth

Three rain layers vary stroke length, opacity and fall speed. Thin, slowly moving haze separates the shore and distant mountains; flattened lake ripples sit on the water. Hierarchically displaced lightning channels branch irregularly inside the clouds. Broad illumination briefly lifts the scene; reflected light remains inside the lake.

## Components

The scene is one full-viewport canvas over a photographic fallback. Rain intensity allows zero and retains 465 drops by default, at most 1,163. One lightning channel with five branches has 110 vertices total. Controls expose rain, weather speed (including zero), signed wind, lightning, flash interval, brightness, haze and water effects through the host settings.

Host pause, visibility and FPS profiles govern rendering. Reduced motion starts with a still frame and suppresses lightning even after resume. Speed zero freezes time-driven effects. The offline package contains `manifest.json`, `index.html`, `scene.js`, `background.jpg` and `preview.jpg`. Image provenance and the exact generation prompt are retained in [the theme documentation](../alpine-thunderstorm.md) and [background-prompt.txt](background-prompt.txt).

## Do's and Don'ts

- **Do** keep the source photograph fixed and let bounded, layered weather carry the motion.
- **Do** keep flashes occasional, irregular and measured; respect lightning and reduced-motion controls.
- **Don't** put lightning or foreground rain into the source photograph.
- **Don't** add HUD text, audio, external dependencies or unbounded particle accumulation.
