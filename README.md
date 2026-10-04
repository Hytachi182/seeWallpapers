# seeWallpaper

**An open-source Windows live wallpaper platform with beautiful templates, easy customization and a creator-friendly template SDK.**

## Current milestone

Foundation and initial wallpaper engine: a WPF application shell, local template discovery, a versioned manifest contract, settings validation, structured logging, and a gallery containing Digital Rain 3D, Sakura Night, and AI Core.

The initial engine renders templates through WebView2 for both Preview and Apply. Its Win32 desktop integration is centralized in `DesktopSurface`; `DesktopWallpaperHost` manages the wallpaper lifecycle. Apply supports one selected display, clone, and span; per-display assignment persistence and performance policies follow in the next milestones.

## Architecture

- `SeeWallpaper.App` — WPF UI and composition root
- `SeeWallpaper.Core` — domain contracts
- `SeeWallpaper.TemplateEngine` — discovery and manifest validation
- `SeeWallpaper.Engine` — wallpaper lifecycle contracts
- `SeeWallpaper.System` — display and system-metrics contracts
- `SeeWallpaper.Infrastructure` — local configuration and logging

## Run

```powershell
dotnet build seeWallpaper.sln
dotnet run --project src/SeeWallpaper.App
```

## Template SDK

See [docs/template-format.md](docs/template-format.md). Installed templates run locally and do not require an Internet connection.

Select **Customize** on a gallery card to preview a template and modify the controls declared in its manifest. Settings are saved per template in `%LocalAppData%\seeWallpaper\settings` and are reused when applying the wallpaper.

## Import and export

Templates are installed in `%LocalAppData%\seeWallpaper\templates`. Use **Import .seewall** or a template's **Export** action. `.seewall` is a ZIP package with a required root-level `manifest.json`; imports validate the manifest, package paths, file count, compressed package size (100 MB) and extracted size (250 MB) before installation.

## Licence

MIT. See [LICENSE](LICENSE).
