# Changelog

## Unreleased

## 1.13.1 - 2026-10-08

<!-- generated-release:start -->
### Changes since v1.13.0

Built-in catalogue: **57 wallpapers**.

#### Updated wallpapers

- **Inkbound Courier** (`inkbound-courier`): An original manga illustration in midnight ink, ivory paper and vermilion: an adult rooftop messenger above a fictional coastal town. Wind-borne petals, drifting harbor mist and breathing window lights. Original generated artwork; no franchise characters or external assets. Entirely offline.
- **Rose Riviera** (`rose-riviera`): An original rose-pink fashion miniature overlooking the sea: a curved coastal villa, turquoise pool, tropical garden, pearlescent convertible and original adult fashion figurines. Animated water reflections, drifting bougainvillea petals, champagne lights and delicate glints. Generated original artwork, entirely offline.
- **Satin Afterglow** (`satin-afterglow`): An original manga fashion scene: an adult woman in an opaque burgundy evening dress on a rose-framed terrace at twilight. Drifting rose petals, gentle lantern lights, distant haze and star glimmers. Tasteful, fully clothed glamour with original generated artwork. Entirely offline.

#### Development changes

- fix: refine manga and Rose Riviera material animations

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.13.0...v1.13.1)
<!-- generated-release:end -->

## 1.13.0 - 2026-10-08

Explorer desktop and taskbar clicks no longer trigger fullscreen pause, and pause rules apply before saved wallpapers are restored at startup. Display refresh recovers closed or detached Clone/Span wallpaper windows without a monitor-layout change. Damaged or inaccessible performance settings use safe defaults without blocking startup.

Validation and remaining desktop/packaging checks are recorded in [the release notes](docs/releases/v1.13.0.md).

<!-- generated-release:start -->
### Changes since v1.12.0

Built-in catalogue: **57 wallpapers**.

#### New wallpapers

- **Inkbound Courier** (`inkbound-courier`): An original manga illustration in midnight ink, ivory paper and vermilion: an adult rooftop messenger above a fictional coastal town. Wind-borne petals, drifting harbor mist and breathing window lights. Original generated artwork; no franchise characters or external assets. Entirely offline.
- **Satin Afterglow** (`satin-afterglow`): An original manga fashion scene: an adult woman in an opaque burgundy evening dress on a rose-framed terrace at twilight. Drifting rose petals, gentle lantern lights, distant haze and star glimmers. Tasteful, fully clothed glamour with original generated artwork. Entirely offline.

#### Development changes

- feat: add two original animated manga wallpapers
- fix: restore desktop wallpapers reliably and honor startup pause rules

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.12.0...v1.13.0)
<!-- generated-release:end -->

## 1.12.0 - 2026-10-07

<!-- generated-release:start -->
### Changes since v1.11.0

Built-in catalogue: **55 wallpapers**.

#### New wallpapers

- **Burrow Battle** (`burrow-battle`): An original self-playing artillery battle between two teams of tiny burrowers on floating meadow islands. Wind-driven rockets and grenades carve real craters, blast opponents into the sea, and decide alternating turns. Health, team scores and automatic rematches. Original procedural cartoon art, entirely offline.
- **Copper Current** (`copper-current`): An original macro circuit-board wallpaper: deep green solder mask, copper traces, plated vias, graphite chips, metal pins and miniature electronic components. Gentle luminous signals follow the routed traces and status LEDs breathe softly. Procedural artwork, customizable illumination and entirely offline.
- **Rose Riviera** (`rose-riviera`): An original rose-pink fashion miniature overlooking the sea: a curved coastal villa, turquoise pool, tropical garden, pearlescent convertible and original adult fashion figurines. Animated water reflections, drifting bougainvillea petals, champagne lights and delicate glints. Generated original artwork, entirely offline.
- **Velvet Circuit** (`velvet-circuit`): An original self-playing pinball machine in an atmospheric arcade. A chrome ball rolls under gravity, collides with rails, posts, pop bumpers and slingshots, and is struck by reactive mechanical flippers. Automatic spring launches, three-ball games, scoring, target banks and persistent session high scores. Procedural perspective rendering with lacquer, metal and glass materials, entirely offline.

#### Development changes

- feat: add four wallpapers and fix multi-monitor DPI scaling

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.11.0...v1.12.0)
<!-- generated-release:end -->

- Add five opt-in functional desktop scenarios for three real monitors, using the actual assignment service, native wallpaper windows and WebView rendering: independent scenes/replacement/removal/failure preservation, clone/span/local transitions, persisted restoration, DPI contexts and simulated disconnect/reconnect. Capture and check rendered edge pixels, physical viewport sizes and correct scene identity. Support testing binaries extracted from a portable ZIP, with PNG, JSON and TRX evidence.

- Fix mixed-DPI multi-monitor geometry: detect fresh native monitor rectangles in physical pixels, share those rectangles between independent/duplicate/span modes, and convert desktop coordinates after Explorer attachment. Prepare WebView windows on their target monitor before initialization. Add current-mode/DPI regression checks and verify both native window bounds and WebView viewport dimensions on the real desktop.

- Add **Copper Current**: a procedural dark green circuit-board wallpaper with copper traces, graphite chips, metal pins, passive components, moving signals and softly glowing LEDs. Cached static artwork, customizable settings and offline operation.

- Add **Velvet Circuit**: an original autonomous pinball machine with a chrome ball, physical rail/bumper/target contacts, reactive rotating flippers, spring launches, three-ball games, bonus multipliers and session high scores. Offline perspective rendering with metal, lacquer and glass materials.

- Add **Rose Riviera**: an original rose-pink coastal fashion miniature with generated artwork, pool reflections, drifting bougainvillea petals, champagne lights and subtle glints. Offline, with speed-zero and reduced-motion stills. No branded names, logos or character assets.

- Add **Burrow Battle**: an original self-playing artillery game with two burrower crews, wind-driven rockets and grenades, destructible meadow terrain, blast knockback, drowning, crew health and automatic rematches. Offline, with host-controlled settings and lifecycle.

## 1.11.0 - 2026-10-06

<!-- generated-release:start -->
### Changes since v1.10.0

Built-in catalogue: **51 wallpapers**.

#### New wallpapers

- **Galactic Battle** (`galactic-battle`): An original cinematic orbital battle above a blue planet. Nine curved-hull interceptors and asymmetric raiders cross the sky with ion-engine light, laser salvos, distant explosions and drifting debris around an immense ring-shaped cruiser. Generated artwork, entirely offline.

#### Updated wallpapers

- **War Front** (`war-front`): A burning harbour at sunset brought to life with billowing smoke, animated flames, rising embers, frequent tracer salvos and distant city explosions. Pulsing jet exhaust, helicopter rotors and shimmering water complete the supplied illustration. Original soldiers remain stable; entirely offline.

#### Development changes

- feat: add original Galactic Battle and strengthen War Front animation

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.10.0...v1.11.0)
<!-- generated-release:end -->

- Add Galactic Battle: an original photographic orbital scene with nine moving curved-hull interceptors and asymmetric raiders, red/green laser salvos, engine light, distant explosions and drifting debris. Generated artwork, offline and host-controlled.


- War Front 1.1.0: strengthen rising smoke, animated flame tongues and ember streams, lengthen and increase tracer salvos, add six distant city impact sites with sparks and smoke, and support zero animation speed. Original soldiers remain stable.


## 1.10.0 - 2026-10-06

<!-- generated-release:start -->
### Changes since v1.9.0

Built-in catalogue: **50 wallpapers**.

#### New wallpapers

- **Alpine Thunderstorm** (`alpine-thunderstorm`): A photographic alpine lake beneath rolling storm clouds, with layered wind-driven rain, drifting moisture haze, lake ripples and occasional branched lightning illuminating the clouds and water. Original offline scenery with adjustable lightning frequency and flash brightness.
- **Particle Nexus** (`particle-nexus`): A particles.js wallpaper with drifting luminous nodes, fine proximity links and a quiet atmospheric background. Adjustable density, light color, movement, connection distance and optional pointer interaction. All library files are bundled for offline use.
- **Underwater Blue** (`underwater-blue`): A living photographic underwater reef with swimming tropical fish, an animated distant shoal and rising bubble streams. Fish tails beat as they cross the scene; sun shafts, seabed light and current-borne particles add depth. Entirely offline.
- **War Front** (`war-front`): The supplied war_game_wallpaper.svg brought to life: drifting smoke above a burning city, flickering fires and airborne embers, distant tracer fire, pulsing jet exhaust, helicopter rotor motion and shimmering harbour reflections. The original soldiers and composition stay fixed. Entirely offline.
- **Winter Snowfall** (`winter-snowfall`): Photographic snowfall in a quiet alpine forest at blue hour. Fine distant snow, drifting midground flakes and softly defocused foreground snow fall at different speeds with gentle wind gusts over an original snowy chalet photograph. Entirely offline.

#### Development changes

- build: preserve pinned particles.js bytes on Windows
- feat: add five animated themes and live gallery search

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.9.0...v1.10.0)
<!-- generated-release:end -->

- Gallery: filter wallpaper names as you type, with case/accent-insensitive matching, clear search and an empty-result message in all eight interface languages.

- Update Underwater Blue to 1.1.0: add 12 swimming fish with animated tails, a distant shoal and 54 visible rising bubbles enabled by default; strengthen current motion and preserve lifecycle controls.

- Add Underwater Blue: original photographic sea scenery with animated water refraction, sun shafts, seabed light, marine particles and optional bubbles.

- Add Alpine Thunderstorm: photographic storm scenery with layered rain, gusts, occasional branching lightning, atmospheric illumination and lake effects.

- Add Winter Snowfall: an original photographic winter theme with layered falling snow, directional wind, nearby defocused flakes and adjustable intensity/speed/size.

- Add Particle Nexus, an offline particles.js theme with adjustable particle density/colors, proximity links, soft light and host-controlled movement.

- Add War Front, an offline animated adaptation of the supplied war_game_wallpaper.svg with smoke, fire, aircraft effects, distant tracers and water reflections.

## 1.9.0 - 2026-10-06

<!-- generated-release:start -->
### Changes since v1.8.0

Built-in catalogue: **45 wallpapers**.

#### New wallpapers

- **Amber Maze** (`amber-maze`): An original self-playing maze chase. A lantern robot gathers shards through changing labyrinths, avoids angular sentinels and uses temporary overcharge to disable pursuers. Real scores, lives, new mazes and automatic restarts. Procedural pixel art, entirely offline.
- **Castle Raid** (`castle-raid`): Original tiny pixel knights march on a fortress, brave defensive arrows and break the gate. Each victory launches a fresh automatic raid. Procedural artwork, entirely offline.
- **Crystal Run** (`crystal-run`): An original pixel-art platform adventure that plays itself. A little explorer robot leaps between floating ruins, collects crystals, avoids clockwork beetles and reaches the beacon. New trails alternate between dawn, twilight and moonlight. Entirely procedural and offline.
- **Dungeon Loop** (`dungeon-loop`): An original adventurer automatically explores connected dungeon corridors, fights stone sentries, opens treasure chests and descends to the next floor. Procedural artwork, entirely offline.
- **Meteor Shower** (`meteor-shower`): A photographic Milky Way above an alpine lake, crossed by a continuous automatic shower of shooting stars. Fine white-hot meteor heads, tapered luminous trails, subtle star scintillation and occasional brighter fireballs with fading atmospheric trains. Original offline artwork.
- **Neon Rally** (`neon-rally`): A self-playing retro paddle duel with mint and coral opponents. Autopilots predict wall rebounds, react imperfectly, add spin and exchange accelerating rallies. Real scoring, first-to-seven matches and automatic restarts. Original procedural visuals, entirely offline.
- **Orbital Defender** (`orbital-defender`): An original self-playing retro space shooter. An autopilot intercepts waves of geometric drones, dodges fire and defends an orbital outpost behind destructible shields. Includes scores, escalating waves and automatic game restarts. Original procedural pixel art, entirely offline.
- **Pixel Defender** (`pixel-defender`): Futuristic turrets automatically track and intercept waves of drones over a pixel outpost. Guided shots, shield damage and endless escalating waves. Procedural artwork, entirely offline.
- **Pixel Island** (`pixel-island`): Tiny island settlers gather wood and carry it to construction sites. Five homes rise from foundations, a sailboat circles the coast and settlement cycles repeat. Procedural artwork, entirely offline.
- **Rain on Glass** (`rain-on-glass`): Photographic blue-hour rain on a pane of glass: droplets settle, grow, merge and slide under gravity, leaving fading wet trails. Real-time refraction, curved reflections and tiny beads over an original city photograph. Entirely offline.
- **Robot Factory** (`robot-factory`): A self-running robot assembly line. Mechanical stations fit chassis, install cores and activate robots on moving conveyor belts in continuous production. Procedural artwork, entirely offline.
- **Rooftop Rivals** (`rooftop-rivals`): An original self-playing arcade robot fight on an industrial rooftop at dusk. Two autonomous fighters exchange punches, kicks, jumps, guards and energy pulses. Real health, combos, timed rounds and best-of-three matches restart automatically. Procedural pixel art, entirely offline.
- **Tiny City** (`tiny-city`): A living pixel city with two-way traffic, walking residents, illuminated windows, drifting clouds, rain and a continuous day/night cycle. Procedural artwork, entirely offline.
- **Tower Climber** (`tower-climber`): An original pixel explorer automatically jumps between procedurally generated ledges on an endless tower. A scrolling camera follows the ascent with safe fall recovery. Procedural artwork, entirely offline.

#### Updated wallpapers

- **Biker Road** (`biker-road`): A coastal motorcycle ride at sunset, with moving asphalt, drifting clouds, golden sea reflections, passing birds, exhaust smoke, roadside dust, moving sun rays and a pulsing tail light. Based on the supplied biker_road_wallpaper.svg artwork.

#### Development changes

- feat: add nine autonomous pixel and photographic weather themes
- fix: offer GitHub downloads for portable and development builds
- ci: use supported ARM Linux runners for release orchestration
- fix(ci): validate pipeline changes while a release awaits publication
- ci: separate version preparation, validation and Windows publication
- améliorations

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.8.0...v1.9.0)
<!-- generated-release:end -->

- Add Meteor Shower: an original photographic night sky with automatic shooting stars, occasional fireballs, lingering atmospheric trails and adjustable density/speed/light settings.

- Add Rain on Glass: a photographic offline rain theme with merging droplets, gravity-driven runs, fading trails, WebGL refraction and adjustable rain/softness settings.

- Add seven original offline automatic pixel themes: Pixel Defender, Castle Raid, Tiny City, Dungeon Loop, Pixel Island, Robot Factory and Tower Climber, with settings, previews and host lifecycle support.

## 1.8.0 - 2026-10-05

<!-- generated-release:start -->
### Changes since v1.7.0

Built-in catalogue: **31 wallpapers**.

#### New wallpapers

- **Biker Road** (`biker-road`): A coastal motorcycle ride at sunset, with perspective road trails, drifting clouds, golden sea reflections and a breathing tail light. Based on the supplied biker_road_wallpaper.svg artwork.

#### Updated wallpapers

- **Pirate Cove** (`pirate-cove`): A young pirate overlooking a sunset cove, with gentle folds in the red banner, scarf and cloak, a flickering lantern, warm harbour lights, flowing waterfalls, sea reflections and distant gliding seagulls.

#### Development changes

- améliorations
- fix: prepare releases on devops and publish from a single main PR

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.7.0...v1.8.0)
<!-- generated-release:end -->

- Refine Pirate Cove: keep the pirate?s head and camera stable, isolate cloth motion with artwork-derived masks, remove duplicated ship/foliage edges, soften water and light effects, and respect zero wind and reduced motion.

## 1.7.0 - Unreleased

- Update the application in one click with **Install and restart**: download the matching installer or portable ZIP, show progress, verify SHA-256, wait for the app to exit, install and reopen automatically. Portable updates back up overwritten files and restore them on failure. Only published stable Windows releases are offered; wallpapers, settings and startup preferences are preserved.

- Customize any scene with optional live CPU, RAM, uptime, power and computer-name widgets. Choose individual metrics, four corner positions, values, gauges or one-minute history graphs, accent color, size, panel opacity and screen-edge spacing. Preferences persist per scene and update previews and active instances immediately. The common overlay leaves the theme's own widgets intact and uses the shared metrics collector only while needed.

- Pirate Cove: an illustrated Anime wallpaper with a young pirate above a sunset cove, animated with isolated folds in the red banner, scarf and cloak, a stable character and camera, subtle sea reflections, flowing waterfalls, warm harbour lights and distant seagulls. Lantern color, speed, light intensity, and wind are adjustable.
- Desert Wanderer: an illustrated desert wallpaper with a cloaked wanderer, animated with a cloak that ripples in the wind (an image warp anchored at the shoulders), heat haze on the horizon, blowing sand veils and streaks, turning sun rays, glowing moons, and an occasional worm sign racing through the dunes. Sun color, speed, light intensity, and wind are adjustable.
- Add a Language button with French, English, German, Spanish, Luxembourgish, Romanian, Polish and Italian, immediate UI updates, and a remembered choice shared by installed and portable editions. First launch follows the Windows UI language when supported, otherwise English. Translate bundled scene descriptions and customization labels without changing template identifiers or settings values.

<!-- generated-release:start -->
### Changes since v1.6.0

Built-in catalogue: **30 wallpapers**.

#### New wallpapers

- **Desert Wanderer** (`desert-wanderer`): A cloaked wanderer on a rocky ridge above an endless desert at sunset, with a cloak rippling in the wind, heat haze on the horizon, blowing sand, sun rays, a giant planet and an occasional worm sign in the dunes.
- **Neon Tetris** (`neon-tetris`): A neon falling-blocks game that plays itself: an AI places every piece, clears lines with particles, chains combos, levels up and starts a new game when it tops out.
- **Pirate Cove** (`pirate-cove`): A young pirate overlooking a sunset cove, with gentle folds in the red banner, scarf and cloak, a flickering lantern, warm harbour lights, flowing waterfalls, sea reflections and distant gliding seagulls.
- **Stellar Drift** (`stellar-drift`): A golden particle sphere surrounded by a violet stardust disk, slowly rotating against deep plum space. No text or overlays.

#### Development changes

- fix: load compatible update helper modules and report promotion merge errors
- améliorations

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.6.0...v1.7.0)
<!-- generated-release:end -->

## 1.6.0 - 2026-10-05

<!-- generated-release:start -->
### Changes since v1.5.0

Built-in catalogue: **26 wallpapers**.

#### New wallpapers

- **Astral Frontier** (`astral-frontier`): An astronaut on a rocky ridge facing a spiral galaxy, a ringed giant and a night-side Earth, with a sunrise flare, glowing atmosphere, twinkling city lights, drifting asteroids and shooting stars.
- **Neon Ronin** (`neon-ronin`): A hooded samurai and his cat watching a neon megacity at night, with rain and puddle ripples, flickering signs, a glowing katana, flying traffic, highway light trails, rotating targets, waterfalls, sakura petals and distant lightning.
- **Orbital Earth** (`orbital-earth`): The Earth surrounded by satellites, with a sunrise on its limb, glowing atmosphere, twinkling city lights, orbiting satellites, radar pings and data links beamed down to the surface.

#### Updated wallpapers

- **Digital Rain 3D** (`digital-rain-3d`): Matrix code rain in three depth planes with focus blur, mirrored glyphs that mutate as they fall, a clock revealed by the rain, CRT scanlines and occasional glitches.

#### Development changes

- améliorations

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.5.0...v1.6.0)
<!-- generated-release:end -->

- Neon Ronin: an illustrated cyberpunk wallpaper with a hooded samurai and his cat, animated with rain and puddle ripples, flickering neon signs, a pulsing katana with a running glint, flying traffic, highway light trails, rotating holographic targets, waterfalls, mist, sakura petals, and distant lightning. Katana color, speed, neon intensity, and rain are adjustable.
- Orbital Earth: an illustrated Space wallpaper of the Earth and its satellites, animated with a sunrise flare, a breathing atmosphere, city lights, satellites orbiting in front of and behind the globe, beacons and panel glints, radar pings, and data links beamed to the surface. Signal color, speed, glow intensity, and star density are adjustable.
- Astral Frontier: an illustrated Space wallpaper with an astronaut facing a galaxy and a night-side Earth, animated with a sunrise flare and lens ghosts, a breathing atmosphere rim, twinkling city lights, orbiting galaxy stars, star flares, shooting stars, drifting asteroids, and pulsing suit lights. Atmosphere color, speed, glow intensity, and star density are adjustable.
- Digital Rain 3D 2.0: redesigned Matrix rain with mirrored glyphs that mutate as they fall, three depth planes with focus blur, luminous heads, the current time revealed in the rain, CRT scanlines, vignette, and occasional glitches. New settings: rain density, clock, and glitch effects.

## 1.5.0 - 2026-10-05

- Automatically reconcile connected displays after topology changes: stop disconnected instances, restore recognized monitors, update changed geometry, and recompute clone/span modes. Events are coalesced and wallpaper operations serialized.
- Identify monitors by their Windows device interface instead of their session display number. Legacy independent assignments require a new selection once; ambiguous identities are never guessed. Port or dock changes can require reassignment.
- A failed independent wallpaper restoration no longer prevents other displays from restoring; warnings are displayed and logged.
- Check update compares the installed application version with GitHub main and offers the official published Windows release when available.
- The installer detects machine-wide WebView2 in both 32-bit and 64-bit registry views.

- Crimson Valley: an illustrated Anime wallpaper animated with falling maple leaves, flowing waterfalls, flickering pagoda lights, river sparkles, drifting mist, gliding birds, and a slow camera drift. Leaf color, speed, atmosphere intensity, and leaf density are adjustable.
- Pure Cosmos: an illustrated Space wallpaper animated with orbiting galaxy stars, twinkling and shooting stars, a breathing planet atmosphere, a pulsing sunrise, a shimmering mirror sea, drifting mist and cosmic dust. Nebula accent, speed, glow intensity, and star density are adjustable.
- Solar System: a layered vector Space wallpaper with a turning Sun and solar prominences, rotating planets, drifting cloud bands, orbiting moons, an asteroid belt in motion, lights travelling along the orbits, and a passing comet. Orbit light color, speed, glow intensity, and star density are adjustable.
- Robot Workshop: a layered vector Tech wallpaper with three articulated robots (a watcher that turns its head, a welder with sparks, a scanner), blinking eyes, flickering hangar lights, a running guide light, drifting fog, and floating dust. Eye light color, speed, light intensity, and dust density are adjustable.
- Lunar Silence: a layered vector Space wallpaper with a rotating Earth, breathing astronaut with visor glint and suit light, twinkling and shooting stars, a passing satellite, and drifting moon dust. Earth glow, speed, glow intensity, and star density are adjustable.
- Wallpapers keep running when the window is closed: seeWallpaper stays in the notification area. Click the icon to reopen the app, or right-click it and choose **Quit and remove wallpapers** to stop it.
- Online page: discover and download new wallpapers published in the GitHub repository, with update offers for newer versions. Downloads are verified file by file before installation. seeWallpaper checks at startup and every six hours, and notifies you from the notification area.
- Sign-in startup now restores wallpapers silently in the notification area, with no window or taskbar button.
- When seeWallpaper does not start with Windows, a warning offers a **Start with Windows** button, in the installed and ZIP editions alike. Startup can also be turned on or off in **Settings**, and installer updates keep the choice made in the app.

<!-- generated-release:start -->
### Changes since v1.4.0

Built-in catalogue: **23 wallpapers**.

#### New wallpapers

- **Crimson Valley** (`crimson-valley`): A lone warrior beneath a crimson maple overlooking a sunset valley, with falling leaves, flowing waterfalls, flickering pagoda lights and drifting mist.
- **Lunar Silence** (`lunar-silence`): A lone astronaut on the lunar surface beneath a slowly turning blue Earth, with twinkling stars, shooting stars, a passing satellite and drifting moon dust.
- **Pure Cosmos** (`pure-cosmos`): A spiral galaxy and a giant ringed horizon over a mirror sea, with orbiting stars, shooting stars, a pulsing sunrise and drifting cosmic dust.
- **Robot Workshop** (`robot-workshop`): Three articulated robots in a quiet hangar: one keeps watch, one welds in a shower of sparks, one scans the hall, under flickering lights, drifting fog and floating dust.
- **Solar System** (`solar-system`): The Sun and the eight planets in an artistic composition, with turning planets, orbiting moons, solar prominences, a drifting asteroid belt, orbit lights and a passing comet.

#### Development changes

- améliorations
- Align installer validation with persisted startup and start promotion CI
- Automate devops promotion, release metadata and verified publication
- Add community wallpaper submissions and creator guides
- Create FUNDING.yml

[Full comparison](https://github.com/Hytachi182/seeWallpapers/compare/v1.4.0...v1.5.0)
<!-- generated-release:end -->

## 1.4.0 - 2026-10-04

- Five original animated Anime scenes: Ninja Anime, Hidden Village, Shinobi Energy, Orange Ninja, and Anime Moon Battle.
- Eighteen built-in wallpapers, with real scene previews and customizable energy color, animation speed, and atmosphere intensity.
- Offline Canvas artwork with flowing scarves, drifting leaves, illuminated rooftops, energy seals, and moonlit battle trails.
- Anime rendering respects pause/resume, performance profiles, reduced motion, and desktop resizing.
- Installer and ZIP checks verify the complete template catalog by ID.

## 1.3.0 - 2026-10-04

- English app interface, display selection, About page, status messages, and errors.
- English Windows installer and shell integration.
- Remove legacy French display-management and uninstall shortcuts during upgrades.
- English portable launcher and guide: `Launch seeWallpaper.cmd` and `README.txt`.
- English README, badges, documentation, release notes, and contribution forms.
- Updated screenshots captured from the English interface.

## 1.2.1 - 2026-10-04

First public release built and verified by GitHub Actions: [downloads](https://github.com/Hytachi182/seeWallpapers/releases/tag/v1.2.1).

- Automatically create the installer validation report directory on a clean checkout.
- Windows installer, portable ZIP, and checksums available through permanent README links.

Includes the features of version 1.2.0.

## 1.2.0 - 2026-10-04

Initial local version; publicly distributed with the 1.2.1 packaging fix.

- About page and Michael Ruffenach creator credit.
- Self-contained Windows installer and portable ZIP.
- Thirteen scenes, previews, customization, and favorites.
- Independent display assignments, duplication, and spanning.
- Persistent assignments, `.seewall` import/export, and single-instance handling.
- Fix WebView2 DPI-context conflicts and WorkerW detection on modern Windows.
- Shortcuts, desktop context-menu integration, and Windows uninstall support.
