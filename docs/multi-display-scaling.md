# Multi-monitor geometry and Windows scaling

The display list shows the current Windows monitor resolution, not an editable wallpaper resolution. Wallpaper windows must use that geometry automatically. A 1920 x 1080 monitor should remain a 1920 x 1080 target even when its Windows interface uses 150% scaling.

Use independent assignments for different scenes on each monitor. Duplicate creates one complete instance per monitor. Span intentionally creates one large panorama over the union of the connected monitor rectangles; a single complete copy on each monitor requires Duplicate instead. Windows extended-desktop mode is compatible with all three application modes.

## Corrected implementation

`WindowsDisplayManager` now enumerates monitors directly under a temporary Per-Monitor V2 thread context, rather than using cached WinForms `Screen.AllScreens` rectangles. Both the application and wallpaper host use the same physical coordinates. Span computes the union of those physical rectangles, including negative positions and vertical offsets.

Desktop attachment converts screen coordinates to the Explorer host's client coordinates after `SetParent`, then positions the window under a fresh physical-pixel context. Microsoft documents that cross-process parenting across differing DPI modes can reset the child's DPI awareness: [SetParent documentation](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setparent). Windows are initially positioned on their target monitor before WebView initialization, and layout is refreshed after attachment.

## Verification on 2026-10-07

- Current native monitor rectangles match `EnumDisplaySettingsEx` resolution and position under DPI-unaware, system-aware, Per-Monitor and Per-Monitor V2 callers. Detection restores the original caller context.
- Tests cover three 1920 x 1080 screens, a 5760 x 1080 horizontal panorama, negative positions and portrait/vertical offsets.
- Live desktop check used three connected monitors: 3440 x 1440 at (0, -1440), 1080 x 1920 at (-1080, -480), and 3440 x 1440 at (0, 0). It verified independent application, replacement, duplication, spanning and duplication after spanning while changing the caller's DPI context. Every native window rectangle and `innerWidth/innerHeight * devicePixelRatio` viewport matched the intended physical geometry. The panorama measured 4520 x 2880.
- Full .NET checks passed: 67 template tests, 110 application tests including opted-in desktop attachment, and the isolated WebView integration test (178 total, none skipped).

This physical setup is different from the reported three-screen Full HD setup. The corrected portable must still be checked there at the user's actual Windows scaling settings. The code does not change Windows display resolution or user assignments.

Run `dotnet run --project build/desktop-check/DesktopCheck.csproj -c Release -- copper-current --dpi-transition` on an interactive workstation with at least two monitors. The test applies temporary wallpapers and removes its own windows on completion. Set `SEEWALLPAPER_DESKTOP_TEST=1` for native attachment tests. Run the WebView integration test separately with `SEEWALLPAPER_WEBVIEW_TEST=1` to isolate its WPF application thread.

## Repeatable functional tests

Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File build/test-multi-display-functional.ps1` on an interactive Windows workstation with at least three monitors. The script builds and runs five xUnit scenarios in separate WPF processes. It fails when the required hardware is absent rather than reporting a three-monitor pass.

To test a portable built from this checkout, add `-PortableZipPath dist/portable/seeWallpaper-1.11.0-Portable-x64-dpi-fix.zip`. The script extracts a temporary copy, adds only the test-runner files, and loads the application/engine assemblies from that extracted payload. Reports record their loaded paths. The launcher and archive are checked separately by `build/test-portable.ps1`.

| Scenario | Functional checks |
| --- | --- |
| Independent | Different colored scenes on every monitor; targeted replacement preserves other instances; failed navigation preserves content and saved state; removal affects one display only. |
| Clone/span/local | Full copies on every screen, one correctly sized panorama, then return to independent scenes after changing one display. Saved modes follow each transition. |
| Restore | Stop and restore independent, cloned and spanning assignments from an isolated on-disk store. |
| DPI contexts | Repeat application under DPI-unaware, system-aware, Per-Monitor and Per-Monitor V2 caller contexts. This does not change Windows scaling settings. |
| Reconcile | Simulate one monitor disappearing/reappearing in the display catalog, while rendering through real monitor windows. Keep saved assignments and untouched connected instances. Physical unplugging is a separate hardware check. |

Each active wallpaper must have the right native rectangle, an Explorer `WorkerW` parent, matching physical WebView viewport and capture dimensions, correct scene identity, no overflow, and expected color at eight corner/edge pixels. The fixtures make wrong assignments, clipping and uncovered edges directly measurable. Tests use the production assignment service and rendering engine; they do not click through the main application's menus.

PNG captures, per-scenario JSON reports, `summary.json` and a TRX test result are written under `build/functional-results/<run-id>/`, which is ignored by Git. They use isolated settings and never save into the user's real assignment store. Temporary test windows are closed when the process ends.

On 2026-10-07, all five scenarios passed from the source build and from the corrected portable payload on the three-monitor setup above. Each run verified 42 rendered captures and 336 edge sample points. These tests strengthen the evidence for the DPI fix, while the user's exact three-Full-HD/scaling combination and actual unplug/dock/sleep transitions still need on-device verification.

## Testing the corrected portable

Quit the existing application from its tray icon first: installed and portable editions share one running instance. Extract the corrected ZIP into a new folder and launch that copy. Open Displays and check its resolution against Windows Settings. Apply independent scenes, then Duplicate, and confirm edge-to-edge coverage on every monitor. Span should produce a continuous panorama rather than three separate full images. Personal settings stay in `%LocalAppData%\seeWallpaper`.
