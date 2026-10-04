# Wallpaper engine

`DesktopWallpaperHost` owns the active wallpaper lifecycle. It creates a `WebWallpaperWindow`, waits for WebView2, injects the minimal `seeWallpaper` JavaScript API, then attaches the native window to the Windows shell `WorkerW` surface behind desktop icons.

The preview window uses that same WebView2 path without the desktop attachment, so template behaviour matches the applied wallpaper.

Win32 calls are contained in `DesktopSurface`. The implementation first asks `Progman` to create its wallpaper worker, locates the worker behind the icon view, and then reparents the wallpaper window there. Failure to locate the expected shell structure is surfaced to the user and logged by the application instead of silently claiming the wallpaper was applied.

The Apply dialog supports one selected display, clone (one synchronized instance per display), and span (one instance across the virtual desktop). The host keeps each instance keyed by its display id, so a future per-monitor assignment UI can apply different templates without changing the lifecycle contract.

## Performance lifecycle

The application persists one of three profiles: `Eco` (20 FPS), `Balanced` (30 FPS), or `High` (60 FPS). The active target is delivered through `seeWallpaper.onPerformanceChanged`. Templates are expected to schedule their frames against that value. During a Windows session lock/unlock, the engine sends the documented `onPause` / `onResume` callbacks to each active wallpaper instance.

Fullscreen foreground applications and power-line status are sampled every two seconds. The Settings panel makes fullscreen and battery pauses explicit user choices. `WindowsSystemMetricsService` separately provides CPU, memory, uptime, hostname, and battery state for the future controlled system-information bridge; templates never query Windows directly.
