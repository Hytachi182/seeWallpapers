# Plan: choose a different wallpaper for each display

Date: 4 October 2026
Status: partially implemented, including the simplified display-selection flow. The complete physical acceptance checklist and automatic reconciliation of display changes remain outstanding.

### Simplified flow delivery - 4 October 2026

- Gallery: actual scene previews, **Apply to my displays**, multiple monitor checkboxes, and global modes under **Options for all displays**.
- **Displays** view: physical layout, app-specific number, resolution, active or saved assignment, scene selection, targeted application, and removal. Removal is disabled while spanning, with guidance for returning to independent mode.
- Identification: three-second overlays placed using native monitor coordinates. Visual matching on monitors with different DPI still needs physical validation.
- Persistence: fix clone-to-local replacement/removal transitions so other assignments survive restart.
- Initial validation: clean build and 16 passing tests, including four assignment-service tests and one WPF target-selection test. WPF renders were checked under `build/visual-review/screen-*.png`; no real monitor wallpaper was applied during this initial validation.
- Initial Release output: `dist/screen-selection/win-x64/SeeWallpaper.App.exe`. The open app was using `dist/latest`, so that location was retained.

The initial state and unchecked items below record the original detailed plan. They do not certify every planned feature. Windows events refresh the interface, but the engine does not yet reconcile connections, resolutions, and DPI automatically.

### WorkerW fix - 4 October 2026

On Windows build 26300, the workstation exposes `WorkerW` as a child of `Progman`. The original search considered only top-level windows. The engine now supports both layouts, checks Win32 calls, and confirms attachment before reporting success. Seventeen tests passed with native checks enabled; attachment and exact bounds were checked on all three monitors. A WPF/WebView2 process also applied Digital Rain 3D to the primary display (3440 × 1440), then removed its temporary instance without changing saved assignments. The complete section 7 acceptance checklist remains outstanding.

## 1. Objective

Allow independent selection of animated content (scene or template) on every Windows monitor, regardless of the number of connected displays.

| Physical display | Selected wallpaper |
| --- | --- |
| Display 1, primary | Digital Rain 3D |
| Display 2 | Sakura Night |
| Display 3 | Operations Center |
| Display 4 and beyond | Any other selected scene |

Changing display 2 must preserve the contents and instances on displays 1 and 3. The same scene may be used on multiple displays.

## 2. Initial code state before implementation

- `ApplyModeWindow.cs` already offered a target display and `SingleDisplay`, `Clone`, and `Span`, using technical Windows identifiers.
- `Apply_Click` in `MainWindow.xaml.cs` called `ApplyAsync` for the selected display, allowing different assignments through successive applications within a session.
- `DesktopWallpaperHost` kept windows in a dictionary keyed by `DisplayId`; `ApplyAsync` replaced only that entry.
- `ApplyAssignmentsAsync` called `StopCore()` before recreating windows, making it unsuitable for an independent change.
- Span used the special `span` key. Applying to a single display did not remove the spanning instance; the transition needed definition and correction.
- `IWallpaperHost` exposed neither assignment state nor per-display stopping; clone/span operations were available on the concrete class.
- `DisplayInfo` contained ID, name, resolution, and primary status. `WindowsDisplayManager` used `Screen.DeviceName`, without persistent hardware identity or positions in that contract.
- Display assignments were not saved/restored. Settings were persisted per template through `TemplateSettingsStore`.
- `WebWallpaperWindow` initialized WebView2 in an asynchronous `Loaded` event. Returning from `ApplyAsync` did not prove navigation or attachment had succeeded.

## 3. Planned user flow

### From the gallery

1. Choose a scene and click **Apply**.
2. Show available displays with number, readable name, resolution, primary badge, and current assignment.
3. Select a target: **Display 1**, **Display 2**, **Display 3**, and so on.
4. Click **Apply to this display**.
5. Show a precise result, such as "Sakura Night applied to display 2", only after engine confirmation.

### From display management

Add a dedicated navigation entry, using labels consistent with the app language.

- Dynamically generate one card per display, without a hard-coded three-display limit.
- Show the physical monitor layout.
- Include number, name, resolution, and primary indicator.
- Show the active scene's preview/name or a "No wallpaper" state.
- Provide **Choose a wallpaper**, **Replace**, and **Remove from this display** actions.
- Provide **Identify displays**, briefly showing numbers on physical monitors.
- Keep **Duplicate across all displays** and **Span across all displays** accessible.
- Show loading and errors on the affected card; keep other displays' actions usable.

The first version applies changes one display at a time. A batch-apply button is not required by the original request.

## 4. Behavior rules

| Action | Expected behavior |
| --- | --- |
| Apply A to display 1, B to 2, C to 3 | Three independent instances and saved assignments |
| Replace B with D on display 2 | Only display 2 changes |
| Remove display 2's wallpaper | Close only that instance; show the underlying Windows background |
| Apply the same scene to two displays | Allow two separate instances |
| Enter clone mode | Replace active assignments with the selected scene on all connected displays |
| Change one display after cloning | Enter independent mode, preserving other displays' scenes |
| Enter span mode | Close independent instances after preparing the virtual-desktop instance successfully |
| Apply to one display while spanning | Exit span, reuse its scene on other connected displays, and apply the new scene to the target |
| Restart the app | Restore valid choices on identified displays |
| Disconnect a display | Stop its instance and retain its assignment as disconnected |
| Reconnect a recognized display | Restore its scene using current dimensions |
| Connect an unknown display | Independent mode: no automatic assignment; clone/span: recompute according to active mode |

Explain the consequences of global transitions in the dialog. Other changes remain local to the selected display.

Customization settings remain shared per template in the first version. Different settings for the same template on different displays are a separate enhancement. A loaded instance receives validated template settings when applied.

## 5. Display identity and storage

Separate the user-visible number, the session's Windows identifier, and the monitor's persistent identity. Do not save choices solely by `Screen.AllScreens` order.

- Extend `DisplayInfo` with position, identification information, and a persistent key when available.
- Investigate Windows identity with docks, identical monitors, and port changes. Do not promise `DeviceName` is stable.
- Match conservatively: reliable persistent identity first, then a documented unambiguous fallback. On ambiguity, request a new assignment instead of applying to another monitor.
- The number in the view must match the identification overlay. Explicitly describe app-specific numbering if Windows numbering cannot be reproduced.
- Recompute coordinates and dimensions when applying; old coordinates are not a persistent reference.

Add `WallpaperAssignmentsStore` in Infrastructure with a versioned file:

`%LocalAppData%\seeWallpaper\configuration\wallpaper-assignments.json`

The persistent contract contains schema version, global mode (`Independent`, `Clone`, `Span`), global template reference for clone/span, and display-identity-to-template-ID associations for independent mode. Disconnected displays remain in the list. Loading, active, and error states belong to runtime state.

Resolve templates through the installed catalog. Do not persist an `InstalledTemplate` object, a window, or an absolute path as the business reference. Use atomic writes, serialize concurrent saves, and explicitly recover invalid files without blocking the gallery.

Save a new assignment only after confirmed engine success. If saving fails after application, report that the wallpaper is active but the choice was not saved, and allow retrying.

## 6. Implementation steps

### Step 1 - Contracts and detection

- [ ] Define persistent assignment and per-display runtime state models.
- [ ] Extend `DisplayInfo` and `WindowsDisplayManager` with layout and identity.
- [ ] Centralize matching between physical display, persistent key, and runtime ID.
- [ ] Expose a detection service replaceable in tests.

### Step 2 - Independent engine and transitions

- [ ] Extend `IWallpaperHost` with per-display operations, state reads, and global modes.
- [ ] Add targeted stopping without calling `StopCore()`.
- [ ] Reserve `ApplyAssignmentsAsync` for global replacements, or reconcile only changed assignments.
- [ ] Expose an asynchronous `WebWallpaperWindow` result covering WebView2 initialization, successful navigation, and desktop attachment.
- [ ] Prepare new content before removing the old instance; on failure, close the new window and preserve previous content where possible.
- [ ] Propagate errors to the service/UI; remove runtime entries for closed windows.
- [ ] Serialize concurrent changes and handle close/cancellation during loading.
- [ ] Implement every transition in the table, including removing the `span` instance.
- [ ] Preserve session pause, battery/fullscreen policies, and FPS profile for every new instance.
- [ ] Log display, template, mode, outcome, and error.

### Step 3 - Persistence and restoration

- [ ] Create `WallpaperAssignmentsStore` and the validation/application/persistence service.
- [ ] Restore from `MainWindow` after template discovery and performance/pause configuration.
- [ ] If no file exists, start without saved assignments; require no manual migration.
- [ ] Isolate errors per display; a missing template must not prevent other restorations.
- [ ] Show missing references and offer replacement selection.
- [ ] When uninstalling an assigned template, show affected displays and clean references after confirmation.

### Step 4 - Assignment interface

- [ ] Add display management to `MainWindow.xaml` and a dedicated card model.
- [ ] Extend `ApplyModeWindow` to show targets and their assignments.
- [ ] Add temporary identification, scene selection, and targeted removal.
- [ ] Show global modes and their consequences using readable names.
- [ ] Refresh cards after success, failure, and topology changes.
- [ ] Preserve keyboard navigation, visible focus, and scrolling with many displays.

### Step 5 - Windows display changes

- [ ] Listen for display changes, coalesce nearby events, and process on the WPF Dispatcher.
- [ ] Reconcile connection/disconnection, primary-display changes, resolution, rotation, and scaling.
- [ ] Reposition assigned windows and handle negative virtual-desktop coordinates.
- [ ] Retain disconnected references without assigning them to unknown monitors.
- [ ] Unsubscribe events and dispose windows on shutdown.

### Step 6 - Validation and documentation

- [ ] Test storage, display matching, and assignment service with fake catalog/detection/host implementations.
- [ ] Verify replacement/removal on display 2 neither stops nor reloads displays 1 and 3.
- [ ] Test clone/independent/span transitions, partial restoration, duplicate identities, and a display disappearing during application.
- [ ] Test load failures, save failures, invalid files, and closing during loading.
- [ ] Run `dotnet build seeWallpaper.sln` and `dotnet test seeWallpaper.sln`.
- [ ] Complete physical acceptance below; fake tests do not validate Windows/WebView2 attachment.
- [ ] Update `README.md` and `docs/wallpaper-engine.md` with delivered features.
- [ ] Regenerate `dist/latest` with `build/publish-latest.ps1` after implementation validation.

## 7. Physical multi-display acceptance

1. With three displays, use **Identify displays** and verify card/monitor matching.
2. Assign Digital Rain 3D to 1, Sakura Night to 2, and Operations Center to 3.
3. Replace only 2 with Rainy Window; verify 1 and 3 continue animating without restart.
4. Remove 2's wallpaper; verify 1 and 3 remain active.
5. Apply the same scene to 1 and 2; verify both instances.
6. Restart the app, verify restoration, and test an unavailable template.
7. Disconnect/reconnect 3; verify its scene is not reassigned to another display.
8. Test a fourth display, portrait orientation, different DPI, and a monitor left of the primary.
9. Test clone to independent, independent to span, and span to a single display according to the rules.
10. Lock/unlock the session and change the FPS profile; verify every instance.
11. Cause a target load failure; verify the error and preservation of other content.

## 8. Completion criteria

- [ ] Users can choose A on display 1, B on 2, C on 3, and continue for N displays.
- [ ] Local changes preserve instances on other displays.
- [ ] The view shows active assignments, errors, and disconnected displays.
- [ ] Choices restore independently of enumeration order.
- [ ] Clone and span remain usable without residual overlapping instances.
- [ ] Reported success corresponds to successful loading and attachment.
- [ ] Build, tests, and physical multi-display acceptance are documented with actual results.

Delivery must distinguish implemented code, passing automated tests, Windows acceptance performed, and regenerated distributions. Creating this plan does not check off any validation.
