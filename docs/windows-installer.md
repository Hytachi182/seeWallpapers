# Windows installation

The Windows x64 distribution is built as `dist/installer/seeWallpaper-Setup-1.4.0-x64.exe`. Its neighboring `.sha256` file contains the checksum. .NET 8 is bundled; no separate .NET installation is required. Public downloads are attached to [GitHub Releases](https://github.com/Hytachi182/seeWallpapers/releases/latest).

The **About** page credits **Michael Ruffenach** as creator and displays the version and available features. Windows application registration uses the same publisher name. A [ZIP edition](windows-portable.md) is available for launching after extraction.

The 1.2.0 baseline passed 22 .NET tests, 23 installation/update/uninstall checks, and 28 ZIP checks locally. The Windows publisher credit is included in those checks. Reports are written under `build/visual-review`. Version 1.2.1 also passed the GitHub release workflow.

The English 1.3.0 edition passed 22 local .NET tests, 25 installer checks, and 28 ZIP checks. Installer checks also verify removal of the two legacy French Start menu shortcuts during an update.

Version 1.4.0 includes eighteen templates and passed 27 local .NET tests, all 25 installer lifecycle checks, and 33 ZIP checks. Template installation is compared against the repository catalog by ID.

## Installation and integration

The English installer runs for the current user, without requesting administrator privileges, in `%LocalAppData%\Programs\seeWallpaper` by default. The destination can be changed.

- Start menu: app, display management, and uninstall.
- Desktop shortcut, selected by default.
- Desktop context menu, selected by default: **Customize my displays with seeWallpaper**, opening the **Displays** page.
- `.seewall` association, selected by default: double-click to import a package. Paths containing spaces are supported. Existing default associations are not overwritten; seeWallpaper is also registered under **Open with**.
- Optional sign-in startup, disabled by default: restore saved choices with a minimized window.
- Uninstall entry in Windows installed apps.

The context menu uses classic shell integration. Windows 11 exposes classic extensions through **Show more options**. First-level integration through `IExplorerCommand` and package identity is not included. See [Microsoft's documentation](https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/integrate-packaged-app-with-file-explorer).

The supplied `seewallpaper.png` is embedded in windows and the header. `build/generate-icon.ps1` creates a Windows icon with seven sizes, from 16 to 256 pixels, for the executable, shortcuts, and installer.

## WebView2

The installer checks the Evergreen WebView2 runtime in the documented user and machine registry keys. If missing, it runs the included signed Microsoft bootstrapper. This requires Internet. A failure blocks installation with retry guidance; an existing runtime is retained.

The build verifies the bootstrapper's Microsoft signature. Uninstalling seeWallpaper does not remove this shared runtime. See [Microsoft's WebView2 distribution documentation](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

## Updating and uninstalling

The application ID remains stable between versions. A new installer updates an existing installation; Windows may ask to close the app to replace files in use. Deselecting an option during an update removes that integration or shortcut.

Uninstall removes program files, shortcuts, context menu, `.seewall` ProgID, startup entry, and Windows application registration. It retains `%LocalAppData%\seeWallpaper`: personal scenes, favorites, settings, and assignments. A `.seewall` association no longer pointing to seeWallpaper is preserved.

Shell commands use one instance per Windows user/session. A second launch forwards its request over a user-restricted local channel. Packages are imported after catalog initialization using the same validation as imports from the interface.

## Build and verify

Install Inno Setup 6, then run:

```powershell
.\build\build-installer.ps1
```

The script generates the icon, publishes a self-contained Windows x64 app with all templates, compiles the installer, and writes its checksum. It reads the version from `SeeWallpaper.App.csproj`. Tools can be supplied explicitly:

```powershell
.\build\build-installer.ps1 -IsccPath 'C:\tools\Inno Setup 6\ISCC.exe' -WebViewBootstrapper 'C:\tools\MicrosoftEdgeWebview2Setup.exe'
.\build\test-installer.ps1
```

The test verifies installation, updates with options enabled/disabled, and uninstall in a temporary directory containing spaces. It temporarily creates real user shortcuts and registry entries, then removes them. It refuses to replace an existing seeWallpaper installation or integration.

The report is written to `build/visual-review/installer-validation.txt`; detailed logs remain in the temporary directory reported by the script. The directory is created automatically on clean checkouts.

Earlier validation on 4 October 2026 also covered desktop/portrait rendering, customization, pause/resume, and native icon extraction. A packaged executable launched with `--screens` reached **My displays**; a second launch forwarded its command, exited successfully, and left one running instance of that version. See `build/visual-review/app-launch-validation.txt` for the local report.

The **Windows release** workflow builds and tests the app, builds and verifies the installer and ZIP, and publishes downloads for a version tag. Manual runs provide artifacts without publishing a release. See the [release procedure](releasing.md).

## Multi-display fix introduced in 1.1.1

`0x8007139F` was reproduced while creating a WebView2 controller with a profile already in use. Local processes showed browsers started with different DPI-awareness modes. The engine now shares an environment per template and DPI mode under `webview-v2`, and explicitly disposes each WebView2 control when closing. Saved settings and assignments are retained.

Real verification loaded Sakura Night simultaneously on three monitors, changed from system DPI to per-monitor DPI context, replaced one scene, duplicated, spanned, and duplicated again. All loads and expected instance counts passed. Report: `build/visual-review/multi-screen-validation.txt`.

To reproduce on an interactive Windows workstation with at least two monitors (temporarily displays scenes, then closes its own windows without saving assignments):

```powershell
dotnet build build/desktop-check/DesktopCheck.csproj
dotnet build/desktop-check/bin/Debug/net8.0-windows/DesktopCheck.dll sakura-night --dpi-transition
```

## Public distribution limits

The installer and app are not signed with a publisher certificate. Signing requires the owner's certificate. A SHA-256 checksum does not replace a publisher signature.

Installation on a machine without WebView2 still needs validation on a clean Windows system. Local verification used the existing runtime; no shared component was removed to simulate its absence.
