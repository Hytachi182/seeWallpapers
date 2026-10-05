# Changelog

## Unreleased

## 1.7.0 - Unreleased

- Update the application in one click with **Install and restart**: download the matching installer or portable ZIP, show progress, verify SHA-256, wait for the app to exit, install and reopen automatically. Portable updates back up overwritten files and restore them on failure. Only published stable Windows releases are offered; wallpapers, settings and startup preferences are preserved.

- Customize any scene with optional live CPU, RAM, uptime, power and computer-name widgets. Choose individual metrics, four corner positions, values, gauges or one-minute history graphs, accent color, size, panel opacity and screen-edge spacing. Preferences persist per scene and update previews and active instances immediately. The common overlay leaves the theme's own widgets intact and uses the shared metrics collector only while needed.

- Pirate Cove: an illustrated Anime wallpaper with a young pirate above a sunset cove, animated with a galleon rocking on its waterline and leaving a wake, a flapping red banner and cloak, swaying foliage, a flickering lantern, harbour lights, waterfalls, glittering sea, sun rays, and gliding seagulls. Lantern color, speed, light intensity, and wind are adjustable.
- Desert Wanderer: an illustrated desert wallpaper with a cloaked wanderer, animated with a cloak that ripples in the wind (an image warp anchored at the shoulders), heat haze on the horizon, blowing sand veils and streaks, turning sun rays, glowing moons, and an occasional worm sign racing through the dunes. Sun color, speed, light intensity, and wind are adjustable.
- Add a Language button with French, English, German, Spanish, Luxembourgish, Romanian, Polish and Italian, immediate UI updates, and a remembered choice shared by installed and portable editions. First launch follows the Windows UI language when supported, otherwise English. Translate bundled scene descriptions and customization labels without changing template identifiers or settings values.

<!-- generated-release:start -->
### Changes since v1.6.0

Built-in catalogue: **30 wallpapers**.

#### New wallpapers

- **Desert Wanderer** (`desert-wanderer`): A cloaked wanderer on a rocky ridge above an endless desert at sunset, with a cloak rippling in the wind, heat haze on the horizon, blowing sand, sun rays, a giant planet and an occasional worm sign in the dunes.
- **Neon Tetris** (`neon-tetris`): A neon falling-blocks game that plays itself: an AI places every piece, clears lines with particles, chains combos, levels up and starts a new game when it tops out.
- **Pirate Cove** (`pirate-cove`): A young pirate overlooking a sunset cove, with a rocking galleon and its wake, a flapping red banner and cloak, swaying foliage, a flickering lantern, harbour lights, waterfalls, glittering sea and gliding seagulls.
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
