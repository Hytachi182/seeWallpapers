# Template format

A template directory must contain `manifest.json`, `index.html`, and its declared preview image. The manifest uses schema version `1` and declares an `engine`, `entry`, `preview`, performance cost, and optional dynamic settings.

Paths are relative to the template root. Absolute paths and traversal segments are rejected. Template JavaScript communicates only through the future `seeWallpaper` SDK; it does not receive process or arbitrary filesystem access.

`settings` fields are rendered automatically in the application. `boolean`, `slider`, `select`, `color`, `text`, `number`, `image`, and `file` are reserved setting types. Slider fields require `min`, `max`, and `step`; select fields provide `options`.

For lifecycle-aware animation, templates can register `seeWallpaper.onPause(callback)`, `seeWallpaper.onResume(callback)`, and `seeWallpaper.onPerformanceChanged(callback)`. The last callback receives the current target FPS; templates should schedule their own draw loop accordingly.

```json
{
  "schemaVersion": 1,
  "id": "my-template",
  "name": "My Template",
  "description": "An offline web wallpaper.",
  "author": "Author",
  "version": "1.0.0",
  "category": "Tech",
  "engine": "web",
  "entry": "index.html",
  "preview": "preview.jpg",
  "performance": "medium",
  "settings": []
}
```

## Publishing online

The app's **Online** page reads the `templates/` folder of the repository's default branch on GitHub. It checks at startup and every six hours, then offers wallpapers that are missing locally. When seeWallpaper is running in the notification area, it also shows a notification.

- **New wallpaper:** create a template folder `templates/<id>/` whose folder name equals the manifest `id`, with its `entry`, `preview`, and local assets. [Submit a ZIP and screenshot](https://github.com/Hytachi182/seeWallpapers/issues/new?template=template_submission.yml), or open a pull request from a fork. After maintainer review and merge into `main`, it appears online without a new app release. See the [sharing guide](wiki/Share-your-template.md).
- **Update:** increase `version` in the manifest and keep the same `author`. Installed copies with a lower version get an **Update** button.
- **Integrity:** each file is checked against the size and Git blob hash in the repository tree before installation. A folder is installed only if its manifest passes validation, and an update replaces the previous copy only after a successful download.
- **Limits:** 500 files and 250 MB per template. Folders without a `manifest.json` are ignored.
