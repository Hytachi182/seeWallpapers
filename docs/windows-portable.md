# Windows ZIP edition

Creator: **Michael Ruffenach**. The app's **About** page displays this credit, the assembly version, and available features.

Build output: `dist/portable/seeWallpaper-1.3.0-Portable-x64.zip` with its SHA-256 checksum. Public downloads use [GitHub Releases](https://github.com/Hytachi182/seeWallpapers/releases/latest).

## Get started

1. Extract the entire ZIP into a writable directory.
2. Open the extracted `seeWallpaper-1.3.0-x64` folder.
3. Double-click **Launch seeWallpaper.cmd**.

The launcher checks Microsoft WebView2 in the 32-bit and 64-bit user/machine registry views. If missing, it verifies the bundled bootstrapper's Microsoft signature and runs it. This first launch then requires Internet. With WebView2 installed, `SeeWallpaper.App.exe` can also be opened directly.

.NET is included. Keep all extracted files together. The ZIP does not create Windows integrations; use the [installer](windows-installer.md) for shortcuts, context menu, file associations, and uninstall support.

## Settings, updates, and removal

Personal scenes and settings stay in `%LocalAppData%\seeWallpaper`, shared with the installed edition. They do not automatically follow the ZIP to another Windows account or USB drive. Close the old version before launching a new one; otherwise, single-instance handling forwards the request to the already running process.

To update, extract the new archive into a new folder. To remove the ZIP edition, close the app and delete its extracted folder. Settings and the shared Microsoft runtime are retained.

## Build and verify

```powershell
.\build\build-portable.ps1
.\build\test-portable.ps1
```

The build publishes a self-contained Windows x64 app with thirteen templates, icon, license, guide, and launcher, then creates an archive with a root folder and checksum. The test extracts it into a path containing spaces and checks files, templates, version, Microsoft signature, and runtime detection. It does not open the app or change Windows integrations.

The 1.2.0 baseline passed 28 ZIP checks and 22 .NET tests locally. The About page was rendered at 1240 × 750 and 980 × 600; its credit, version, scrolling, and return to the gallery were checked. Version 1.3.0 replaces the interface, screenshots, guide, and launcher names with English versions. Reports and captures are stored in `build/visual-review`.

The English 1.3.0 ZIP also passed all 28 checks, including the renamed launcher and guide, runtime detection, and extraction into a path containing spaces. All 22 local .NET tests passed.

The missing-WebView2 installation path still needs validation on a clean Windows system. The seeWallpaper executable is not signed with a publisher certificate.
