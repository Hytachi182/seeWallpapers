# Template artwork

The built-in pack contains twenty-three wallpapers: eighteen original procedural scenes and five animated illustrations. Each directory is an independent package: its HTML, JavaScript, manifest and preview stay inside the template root so import, duplication and export keep working offline.

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
| Aurora Borealis | Layered green aurora curtains, stars and a dark mountain ridge |
| Ocean Dusk | Sunset atmosphere, perspective waves and a moving gold reflection |
| Moonlit Dunes | Layered moon-lit dunes, sand ripples and drifting dust |
| Firefly Grove | Forest silhouettes, moving mist, light shafts and pulsing fireflies |
| Event Horizon | WebGL accretion disk, star field, photon ring and an artistic gravity lens |
| Spectral Forge | Ray-marched, slowly deforming metal torus with iridescent reflections |
| AI Core | Projected spherical lattice and segmented orbital machinery |
| Data Tunnel | Octagonal perspective tunnel and moving light trails |
| Digital Rain 3D | Three glyph layers with luminous heads and independent speeds |
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

Lunar Silence is also hand-maintained. Its source SVG is split into `layers/` (Earth, Earth surface, terminator shade, ground, astronaut); the 560 original stars are inlined in `index.html`. Each layer is rasterized into its own bitmap only on resize, then composed per frame: the Earth surface scrolls under a circular clip, and the astronaut breathes around its boots. Solar System uses the same approach: the backdrop, Sun and each planet (base, surface, shade or rings) are separate layers. Rocky planets scroll their surface under a clip; gas giants keep their bands still and show drifting cloud wisps (and Jupiter's moving spot) to avoid seams. Stars and asteroid-belt data are inlined in its index.html. Robot Workshop rigs its robot: the shared robot design is split into base, torso, two arms and head, rasterized at each robot's scale, then posed per frame around shoulder and neck pivots. The translucent back robot is composited off-screen first so its parts do not show through each other.

## Capture previews and check rendering

The optional tool uses Playwright and the installed Microsoft Edge browser. Install its dependency outside the repository:

```powershell
$previewTools = Join-Path $env:TEMP 'seewallpaper-visual-check'
npm install --prefix $previewTools playwright
node build/capture-template-previews.mjs $previewTools
```

The tool captures desktop (1920×1080), narrow (390×844), and gallery (960×540) renders. Gallery images replace each template's `preview.jpg`; larger captures and a contact sheet go to `build/visual-review`. The tool checks browser errors, visible setting changes, pause/resume, horizontal overflow and Operations Center's SDK values. Fixed `?preview=12` URLs render a deterministic animation frame for screenshots; normal template URLs animate.

After regenerating the artwork and previews, run `build/publish-latest.ps1` to include all template files in the Windows distribution. Browser verification does not prove desktop attachment or GPU performance in the live WebView2 host.
