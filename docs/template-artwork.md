# Template artwork

The built-in pack contains twenty-eight wallpapers: eighteen original procedural scenes and ten animated illustrations. Each directory is an independent package: its HTML, JavaScript, manifest and preview stay inside the template root so import, duplication and export keep working offline.

| Template | Artwork |
| --- | --- |
| Ninja Anime | Original masked rooftop guardian, crimson moon, flowing scarf and drifting blossoms |
| Hidden Village | Terraced tiled rooftops, illuminated windows, waterfall, lanterns and mist |
| Shinobi Energy | Standing shinobi, rotating energy seals, luminous ribbons and rising sparks |
| Orange Ninja | Original orange-cloaked guardian, golden valley and wind-blown leaves |
| Anime Moon Battle | Two airborne shinobi, steel blades, blue moon and animated energy trails |
| Crimson Valley | Bundled illustration (`artwork.jpg`) animated with maple leaves, waterfalls, pagoda lights, river sparkles, mist, birds and a slow camera drift |
| Pure Cosmos | Bundled illustration (`artwork.jpg`) animated with orbiting galaxy stars, shooting stars, planet rim glow, sunrise flare, sea shimmer, mist and dust |
| Lunar Silence | Layered vector artwork (`layers/*.svg`) with a rotating Earth, breathing astronaut, visor glint, twinkling and shooting stars, satellite and moon dust |
| Solar System | Layered vector artwork with a turning Sun, prominences, rotating planets, orbiting moons, moving asteroid belt, orbit lights and a comet |
| Robot Workshop | Layered vector hangar with three articulated robots (head, arms, breathing), blinking eyes, welding sparks, flickering lights, fog and dust |
| Astral Frontier | Bundled illustration (`artwork.jpg`) animated with a sunrise flare, atmosphere rim, city lights, galaxy stars, star flares, meteors, asteroid glints and suit lights |
| Neon Ronin | Bundled illustration (`artwork.jpg`) animated with rain, puddle ripples, neon flicker, katana glow, flying traffic, light trails, holographic targets, petals and lightning |
| Orbital Earth | Bundled illustration (`artwork.jpg`) animated with a sunrise flare, atmosphere, city lights, orbiting satellites with occlusion, beacons, radar pings and data links |
| Desert Wanderer | Bundled illustration (`artwork.jpg`) with a warped, wind-blown cloak, horizon heat haze, blowing sand, sun rays, moons and a worm sign |
| Pirate Cove | Bundled illustration (`artwork.jpg`) with a rocking galleon, warped banner, cloak and foliage, lantern and harbour lights, waterfalls, sea glitter and seagulls |
| Aurora Borealis | Layered green aurora curtains, stars and a dark mountain ridge |
| Ocean Dusk | Sunset atmosphere, perspective waves and a moving gold reflection |
| Moonlit Dunes | Layered moon-lit dunes, sand ripples and drifting dust |
| Firefly Grove | Forest silhouettes, moving mist, light shafts and pulsing fireflies |
| Event Horizon | WebGL accretion disk, star field, photon ring and an artistic gravity lens |
| Spectral Forge | Ray-marched, slowly deforming metal torus with iridescent reflections |
| Stellar Drift | Golden particle sphere and violet dust disk with slow rotation and individual particle drift; no text, network or external runtime |
| Neon Tetris | Self-playing neon arcade, randomly shuffled seven-piece bags, legal AI placements, line-clear particles, combos and automatic new games |
| AI Core | Projected spherical lattice and segmented orbital machinery |
| Data Tunnel | Octagonal perspective tunnel and moving light trails |
| Digital Rain 3D | Mirrored glyph rain in three depth planes with focus blur, mutating symbols, a rain-revealed clock, CRT scanlines and glitches |
| Neural Network | Projected rotating network with traveling edge pulses |
| Sakura Night | Moon, mountains, branching blossom canopy, torii and drifting petals |
| Rainy Window | Layered neon skyline, reflections and foreground glass droplets |
| Operations Center | Reactor composition, clock and real system metrics / history |

The Canvas renderer is maintained in `build/template-scene.js`, and the WebGL renderer in `build/shader-scene.js`. Generated copies are shipped as `scene.js` in each template. Edit the build sources, then regenerate:

```powershell
node build/generate-template-scenes.mjs
node build/generate-shader-templates.mjs
node build/generate-nature-templates.mjs
node build/generate-anime-templates.mjs
```

The Anime renderer is maintained in `build/anime-scene.js`. It draws original cel-shaded characters and landscapes using Canvas paths, with no external assets or franchise characters. All five scenes expose energy accent, animation speed, and atmosphere intensity. Its backing store is additionally capped at 2,073,600 pixels and its default is 30 FPS.

Canvas backing stores resize only on viewport changes and are capped at 1.5 device pixels per CSS pixel. WebGL is capped at 2,073,600 fragments per frame; its default is 30 FPS and low profiles also lower rendering resolution. Both renderers stop scheduling frames on SDK pause or document invisibility and cap reduced-motion users at 15 FPS. These limits bound the work; hardware-specific GPU consumption still depends on the computer and number of wallpapers.

Operations Center only graphs CPU and memory samples received from the system SDK. Missing values appear as em dashes, including unknown battery status. The retained history is 90 samples (three minutes with the host's two-second polling interval). No synthetic measurements populate the wallpaper or its gallery preview.

Crimson Valley and Pure Cosmos are hand-maintained in their own `scene.js` and are not produced by a generator. It cover-fits `artwork.jpg` and positions every overlay in normalized artwork coordinates, so effects stay on the painted waterfalls, pagodas, galaxy and planet at any aspect ratio. It uses the same frame scheduling, pixel cap and SDK hooks as the Anime renderer.

Lunar Silence is also hand-maintained. Its source SVG is split into `layers/` (Earth, Earth surface, terminator shade, ground, astronaut); the 560 original stars are inlined in `index.html`. Each layer is rasterized into its own bitmap only on resize, then composed per frame: the Earth surface scrolls under a circular clip, and the astronaut breathes around its boots. Solar System uses the same approach: the backdrop, Sun and each planet (base, surface, shade or rings) are separate layers. Rocky planets scroll their surface under a clip; gas giants keep their bands still and show drifting cloud wisps (and Jupiter's moving spot) to avoid seams. Stars and asteroid-belt data are inlined in its index.html. Robot Workshop rigs its robot: the shared robot design is split into base, torso, two arms and head, rasterized at each robot's scale, then posed per frame around shoulder and neck pivots. The translucent back robot is composited off-screen first so its parts do not show through each other. Digital Rain 3D is hand-maintained in its own `scene.js` (no longer generated by `generate-template-scenes.mjs`). Glyphs are pre-rendered into one atlas per depth plane, rebuilt only when the colour, glow or scale changes; the clock is a text mask sampled on the focus plane's grid. Desert Wanderer also redraws parts of its painting: the cloak as a grid of displaced cells (still at the shoulders, strongest at the tips) and the horizon as thin wobbling slices for heat haze, which is skipped for reduced motion. Pirate Cove uses the same cell warp for its banner, cloak and foliage, and cuts its galleon out once with feathered edges so it can rock around its waterline.

## Capture previews and check rendering

The optional tool uses Playwright and the installed Microsoft Edge browser. Install its dependency outside the repository:

```powershell
$previewTools = Join-Path $env:TEMP 'seewallpaper-visual-check'
npm install --prefix $previewTools playwright
node build/capture-template-previews.mjs $previewTools
```

The tool captures desktop (1920×1080), narrow (390×844), and gallery (960×540) renders. Gallery images replace each template's `preview.jpg`; larger captures and a contact sheet go to `build/visual-review`. The tool checks browser errors, visible setting changes, pause/resume, horizontal overflow and Operations Center's SDK values. Fixed `?preview=12` URLs render a deterministic animation frame for screenshots; normal template URLs animate.

After regenerating the artwork and previews, run `build/publish-latest.ps1` to include all template files in the Windows distribution. Browser verification does not prove desktop attachment or GPU performance in the live WebView2 host.

Stellar Drift is hand-maintained in `templates/stellar-drift/scene.js`. Its original WebGL renderer is inspired by [prisoner849's particle animation](https://codepen.io/prisoner849/pen/RwyzrVj), with no copied text overlay or Three.js dependency. It uses 150,000 deterministic particles, additive point sprites, per-particle drift and slow rotation. The settings control the outer dust colour, animation speed and brightness. Economical profiles use half the particles; the renderer supports pause/resume, visibility changes and WebGL context restoration. If WebGL is unavailable it displays the bundled preview without text.

Neon Tetris is hand-maintained in `templates/neon-tetris/scene.js`. Live games seed their shuffled seven-piece bags with fresh cryptographic randomness; gallery captures remain reproducible. The AI searches reachable spawn-height rotations and horizontal moves, evaluates legal drops, then animates the chosen path. It clears one to four lines, tracks actual score/combos/levels, and restarts automatically after topping out. Every new game resets its bag and pending clear/effect state. Cached glowing block sprites, floating tetromino silhouettes, a perspective arcade floor and lock pulses surround the board. Portrait layouts put non-overlapping score/next panels above it. Settings control accent, game speed, AI skill, glow brightness, glow and statistics. SDK pause and hidden documents freeze both the simulation and its effects. Run `node build/check-neon-tetris.mjs` for seven-bag fairness, random games, reproducible previews, scoring/clears, restart and sustained autoplay checks; use the preview capture tool with `neon-tetris` for browser settings and lifecycle checks.
