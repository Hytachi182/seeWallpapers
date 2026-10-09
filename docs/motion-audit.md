# Wallpaper animation audit - 2026-10-09

61 repository themes sampled in headless Edge, with default settings, a visible 640 x 360 viewport and three live screenshots after a 500 ms warmup, then at approximately +1.2 and +3 seconds. No JavaScript errors were reported.

The ranking measures the proportion of pixels whose largest RGB-channel change exceeds 8 between the first and later frames. It is a motion-screening heuristic, not an FPS benchmark, an animation count or a visual-quality score. Small self-playing game objects and intermittent weather can rank low despite meaningful animation.

An additional 18-second window confirmed motion in Meteor Shower, Alpine Thunderstorm, Velvet Circuit, Dungeon Loop, Pixel Defender and Winter Snowfall. Their gameplay/weather mechanisms were retained. Operations Center is a live metrics dashboard, so no synthetic metrics were introduced.

## Selected improvements

| Theme | Before changed pixels | After changed pixels | Change |
| --- | ---: | ---: | --- |
| Moonlit Dunes | 0.000% | 20.873% | Visible wind-driven sand streams and faster dust/ripple advection; fixed dune silhouettes. |
| Satin Afterglow | 0.214% | 1.098% | Faster, broader city haze and localized lantern reflections on the terrace; architecture and character preserved. |
| Inkbound Courier | 0.638% | 4.649% | Stronger harbor texture refraction, broader moving haze and faster coastal birds; character preserved. |
| Pirate Cove | 0.692% | 5.178% | Actual sea texture flow inside existing safe water masks and more visible gull passages; head/neck and scarf controls preserved. |
| Lunar Silence | 1.385% | 3.054% | A moving lunar rover with rolling wheels and beacon, faster Earth-surface rotation and reduced-motion suspension. |

Before/after samples use the same short capture protocol. Results can vary with initial phase and load; the improvements were also checked in code and rendered desktop/portrait views. There is no whole-image zoom introduced to inflate the motion metric.

## Full initial ranking

| Theme | Category | Changed pixels |
| --- | --- | ---: |
| Moonlit Dunes | Nature | 0.000% |
| Meteor Shower | Space | 0.083% |
| Velvet Circuit | Games | 0.182% |
| Satin Afterglow | Anime | 0.214% |
| Alpine Thunderstorm | Nature | 0.255% |
| Dungeon Loop | Games | 0.327% |
| Pixel Defender | Games | 0.363% |
| Winter Snowfall | Nature | 0.474% |
| Castle Raid | Games | 0.534% |
| Inkbound Courier | Anime | 0.638% |
| Pirate Cove | Anime | 0.692% |
| Amber Maze | Games | 0.899% |
| Lunar Silence | Space | 1.385% |
| Neon Rally | Games | 1.431% |
| Firefly Grove | Nature | 1.516% |
| Pixel Island | Games | 1.582% |
| Solar System | Space | 2.145% |
| Robot Factory | Games | 2.395% |
| Rain on Glass | Nature | 3.096% |
| Sakura Night | Manga | 3.397% |
| Orbital Defender | Games | 3.889% |
| Hidden Village | Anime | 3.967% |
| Copper Current | Tech | 4.250% |
| Tiny City | Games | 4.415% |
| Rose Riviera | Lifestyle | 5.171% |
| Hollow Lantern | Cinematic | 5.498% |
| Orange Ninja | Anime | 5.754% |
| Anime Moon Battle | Anime | 5.929% |
| Ninja Anime | Anime | 5.968% |
| Burrow Battle | Games | 6.279% |
| War Front | Cinematic | 6.675% |
| Particle Nexus | Tech | 8.518% |
| AI Core | Tech | 8.730% |
| Operations Center | Tech | 8.874% |
| Rooftop Rivals | Games | 8.947% |
| Shinobi Energy | Anime | 9.139% |
| Emberwatch Knight | Cinematic | 9.251% |
| Neon Tetris | Games | 10.003% |
| Galactic Battle | Cinematic | 10.029% |
| Robot Workshop | Tech | 10.167% |
| Rainy Window | Manga | 10.358% |
| Event Horizon | Tech | 11.372% |
| Gilded Court | Cinematic | 15.104% |
| Spectral Forge | Tech | 16.153% |
| Biker Road | Nature | 16.443% |
| Tower Climber | Games | 17.057% |
| Desert Wanderer | Space | 17.993% |
| Astral Frontier | Space | 19.030% |
| Crystal Run | Games | 19.298% |
| Underwater Blue | Nature | 20.676% |
| Orbital Earth | Space | 20.938% |
| Data Tunnel | Matrix | 21.060% |
| Pure Cosmos | Space | 21.606% |
| Crimson Valley | Anime | 23.332% |
| Ocean Dusk | Nature | 23.340% |
| Aurora Borealis | Nature | 24.888% |
| Neural Network | Tech | 28.412% |
| Neon Ronin | Anime | 34.170% |
| Stratos Flight | Cinematic | 36.638% |
| Digital Rain 3D | Matrix | 46.487% |
| Stellar Drift | Space | 63.622% |

## Reproduce

```powershell
node build/audit-template-motion.mjs <temporary-playwright-folder> build/visual-review/motion-audit
python build/score-template-motion.py build/visual-review/motion-audit
node build/audit-template-motion.mjs <temporary-playwright-folder> build/visual-review/motion-audit-after moonlit-dunes satin-afterglow inkbound-courier pirate-cove lunar-silence
node build/capture-template-previews.mjs <temporary-playwright-folder> moonlit-dunes satin-afterglow inkbound-courier pirate-cove lunar-silence
node build/check-motion-improvements.mjs <temporary-playwright-folder>
python build/package_motion_improvements.py
```

Selected scene versions: Moonlit Dunes 1.0.1; Lunar Silence 1.0.1; Satin Afterglow 1.0.2; Inkbound Courier 1.0.2; Pirate Cove 1.0.2. Offline packages include every local layer and dependency. Physical desktop attachment and performance across GPUs were not validated by this browser audit.

All five updated scenes were copied to the local seeWallpaper template catalogue; every installed file was verified against its source with SHA-256. Reapply the scene to reload its current files. Satin's final revision uses haze and lantern reflections without river refraction; its character, portrait, offline and motion-preference checks passed again after that correction.
