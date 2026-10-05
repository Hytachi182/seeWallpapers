# Changelog

## Unreleased

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

- Automate devops promotion, release metadata and verified publication
- Add community wallpaper submissions and creator guides
- améliorations
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
