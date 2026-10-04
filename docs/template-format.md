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
