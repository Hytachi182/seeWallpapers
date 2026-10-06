# Automatic pixel worlds

Seven original, offline wallpapers join the Games catalogue. Select a theme in the application and apply it to a display, or import its `dist/<id>.seewall` package. No keyboard input or internet connection is needed.

| Theme | Autonomous behavior |
| --- | --- |
| Pixel Defender | Three tracking turrets intercept approaching drones with guided shots. Drone escapes damage the shield; each completed wave restores it and increases the next wave. |
| Castle Raid | Knights advance, endure fortress arrows and attack the gate. The fortress resets after each victory. |
| Tiny City | Two-way traffic, pedestrians, changing windows, moving clouds, clear/rainy weather and an 80-second day/night cycle. |
| Dungeon Loop | An explorer follows connected walkable corridors, fights sentries, opens chests and advances to the next floor. |
| Pixel Island | Eight settlers gather and carry wood to five construction sites. Finished settlements remain visible before the construction cycle restarts. |
| Robot Factory | Conveyor robots stop at three mechanical stations for chassis, core and activation before leaving the production line. |
| Tower Climber | An explorer calculates jumps to generated ledges; the camera scrolls upward indefinitely. Missed jumps recover to a safe ledge. |

All themes expose an accent color, simulation speed, particles and an optional progress display. They support host pause/resume, document visibility and the performance FPS limit. Reduced motion opens a still frame; an explicit host resume starts the simulation. Scenes use a 640 by 360 logical pixel canvas fitted to the display, retaining the whole scene in portrait orientation.

Artwork consists of original code-drawn sprites and environments, with no downloaded fonts, assets or requests. The visual direction extends the existing self-playing game collection: restrained pixel palettes, small original characters, readable scene silhouettes and optional compact progress strips. Canvas memory, actors and particles remain bounded during continuous play.

## Development and validation

`build/pixel-worlds.js` owns the shared lifecycle, drawing primitives and seven independent simulations. Run `node build/generate-pixel-worlds.mjs` after editing it; the generated folders are self-contained and ship with the application automatically.

Run `node build/check-pixel-worlds.mjs` for deterministic previews, connected dungeon paths, bounded state and ten minutes of fixed-step autoplay per theme. Run the existing preview capture tool with the seven IDs to generate `preview.jpg`, inspect desktop/portrait scenes and verify every setting and pause/resume in Edge. Then run `python build/package_pixel_worlds.py` to create and verify each package with the four files `manifest.json`, `index.html`, `scene.js`, `preview.jpg` at the archive root.

Browser and simulation checks do not measure physical desktop attachment or CPU/GPU use on a real multi-monitor setup.
