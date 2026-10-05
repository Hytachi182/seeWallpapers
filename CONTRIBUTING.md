# Contributing

## Create and share a wallpaper

Community wallpapers are welcome! You do not need write access to this repository. The maintainer reviews each scene before adding it to the public catalogue.

**The easiest route:** [submit a wallpaper](https://github.com/Hytachi182/seeWallpapers/issues/new?template=template_submission.yml), attach a ZIP and screenshot, and complete the form. No Git or fork required. Read the [sharing guide](docs/wiki/Share-your-template.md) and [creation guide](docs/wiki/Create-a-template.md). GitHub accepts ZIP attachments up to 25 MB; larger packages can be submitted with a download link.

**Prefer a pull request?** Follow these steps:

1. **Fork** [seeWallpapers](https://github.com/Hytachi182/seeWallpapers/fork), then create a branch such as `template/my-scene` in your fork.
2. Create `templates/my-scene/` with `manifest.json`, the HTML entry page, a preview image, and all local assets. Start from the [template format and SDK](docs/template-format.md) and the [existing scenes](templates). Use a unique ID matching the folder name, your creator name in `author`, and version `1.0.0` for a new scene.
3. Test your scene in seeWallpaper. Check the preview, desktop rendering, settings, pause/resume, and all three performance profiles. Include a screenshot or short recording with your submission. If building from source, follow the [development instructions](README.md#develop).
4. Commit and push your branch to **your fork**. On GitHub, choose **Contribute → Open pull request**, targeting `Hytachi182/seeWallpapers:main`. Use the [template submission checklist](.github/PULL_REQUEST_TEMPLATE/template.md) in your description.
5. Wait for CI and maintainer feedback. Make requested changes on the same fork branch; the pull request updates automatically. Once merged into `main`, the scene appears in the app's **Online** catalogue at its next refresh, without an app release.

You can also use GitHub's **Add file → Upload files** in your fork to upload a completed template folder; Git commands are optional. A fork or an unmerged pull request alone does not publish a scene to the official catalogue.

Use only original assets or assets with licences that permit redistribution in this repository. Credit reusable assets and include their licence notices. Bundle dependencies locally so the wallpaper runs offline. Use the documented SDK for settings, system information, pause/resume, and target FPS.

For an update, keep the same template ID and author, increase its version, and submit another pull request. Do not replace another creator's scene with your own.

For direct sharing outside the official catalogue, export your installed wallpaper as a `.seewall` package from the app and share that file. Recipients can import it in seeWallpaper. This does not require a GitHub contribution or publish anything to the official catalogue.

## Application changes

Keep responsibilities separated by project boundary, preserve nullable annotations, and add tests for template parsing or validation changes. Templates must be original or explicitly reusable, work offline, and expose only documented SDK capabilities.

Run `dotnet build seeWallpaper.sln` and `dotnet test seeWallpaper.sln` before opening a pull request. Test template packages must include a root-level manifest, safe relative paths, and a preview image.

Use the issue forms for bugs and feature requests. Include Windows version, screen configuration and application version when reporting rendering problems. For a pull request, explain the resulting behavior and the checks performed; attach screenshots when changing the interface.

Do not commit generated `dist/` files, downloaded prerequisites, caches or local validation captures. Public releases are built by GitHub Actions and attached to versioned releases. See [release instructions](docs/releasing.md).
