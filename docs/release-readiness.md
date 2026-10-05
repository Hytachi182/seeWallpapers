# Release validation record - 1.5.0

Historical local validation recorded on 5 October 2026 for 1.5.0. Versions 1.5.0 and [1.6.0](https://github.com/Hytachi182/seeWallpapers/releases/tag/v1.6.0) have since been published; the local source now prepares 1.7.0. The checks below describe the original 1.5.0 build, not validation of later local additions.

## Implemented

- Debounce Windows display events, serialize reconciliation with manual assignments, retain disconnected independent choices, and restore recognized monitors.
- Reapply only changed independent displays. Recompute clone/span after topology changes.
- Use Windows monitor device interface identities; require selection again for legacy independent choices rather than guessing a match from a reused display number.
- Isolate independent restoration failures and surface warnings; cancel display recovery during exit.
- Detect WebView2 in both machine registry views.
- Prepare a distinct 1.5.0 version, changelog, and release notes for all local additions.

Monitor identity uses [`EnumDisplayDevicesW` with `EDD_GET_DEVICE_INTERFACE_NAME`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-enumdisplaydevicesw). This identifies the Windows monitor device interface; it is not a promise that an identity survives moving the monitor to another port or dock.

## Validation

- Full Release test run with `SEEWALLPAPER_DESKTOP_TEST=1`: 55 passed, zero skipped. Includes real hidden-window desktop attachment on connected monitors.
- Regression coverage: disconnect/reconnect with changed runtime ID, unknown monitor reusing an ID, unchanged displays, geometry changes, failed replacement retry, global topology recomputation, ambiguous identities, and isolated restoration failures.
- The self-contained x64 installer compiles successfully with the signed Microsoft bootstrapper. Its lifecycle test was attempted but safely refused because this workstation already has a seeWallpaper sign-in startup entry; installation/update/uninstall for 1.5.0 is not certified.
- The self-contained portable ZIP passes 38 checks: checksum, complete executable/runtime payload, all 23 template IDs and entry/preview files, 1.5.0 metadata, signed Microsoft bootstrapper, and launcher runtime detection from a path containing spaces.
- Final EXE, ZIP, and SHA-256 checksums are prepared in `dist/release`; the running app in `dist/latest` is retained and has not been restarted or upgraded.

## Remaining acceptance before broad promotion

1. On a disposable Windows 10/11 VM with no WebView2 runtime, install the EXE while online, launch and apply a scene, then uninstall. Confirm runtime installation and retained personal settings. Repeat using the portable launcher on a separate clean snapshot. Do not remove the shared runtime from a personal workstation to simulate this case.
2. On a physical multi-monitor workstation, assign different scenes, unplug/replug a monitor, and verify only that instance changes. Repeat Duplicate and Span, resolution/orientation/scaling changes, docking, and a changed port. Check that unknown identities do not inherit another monitor's selection.
3. Check sleep/resume, lock/unlock, sign-in startup, quit during loading, and a long-running session on representative GPUs. Record CPU/GPU/memory consumption with several scenes.
4. Publisher signing requires the owner's trusted signing certificate. Checksums and the signed Microsoft bootstrapper do not sign seeWallpaper itself.

The physical-hardware acceptance checks above remain outstanding in this local record. Build checks alone do not certify broad hardware compatibility.
