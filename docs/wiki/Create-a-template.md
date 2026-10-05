# Create a template

A seeWallpaper scene is a small offline HTML/CSS/JavaScript project. It can render with Canvas, WebGL, or ordinary HTML elements.

## Folder structure

```text
my-scene/
  manifest.json
  index.html
  scene.js
  preview.jpg
  assets/
```

Use a unique template ID matching the folder name. Keep every dependency inside the folder: images, fonts, scripts, and media must work without an Internet connection.

## Describe your scene

Create `manifest.json`:

```json
{
  "schemaVersion": 1,
  "id": "my-scene",
  "name": "My Scene",
  "description": "A short description of the atmosphere and animation.",
  "author": "Your creator name",
  "version": "1.0.0",
  "category": "Nature",
  "engine": "web",
  "entry": "index.html",
  "preview": "preview.jpg",
  "performance": "medium",
  "settings": []
}
```

`entry` and `preview` must refer to existing files using relative paths. The performance cost must be `low`, `medium`, or `high`. Add a real screenshot of your scene as the preview.

## Use the SDK

The app injects `window.seeWallpaper`. Use its documented callbacks to apply settings, stop animation when paused, resume without creating duplicate loops, and respect the selected target FPS: Eco 20, Balanced 30, High 60.

System information is available through `getSystemInfo()` and `onSystemInfoChanged(callback)` if your scene needs it. A regular browser does not provide this SDK, so test the scene in seeWallpaper as well.

See the [template format and SDK](https://github.com/Hytachi182/seeWallpapers/blob/main/docs/template-format.md), and study an [existing scene](https://github.com/Hytachi182/seeWallpapers/tree/main/templates) for a complete implementation. If reusing code or assets, keep their licence notices and credits.

## Test in the app

1. ZIP the **contents** of the scene folder so `manifest.json` is at the archive root, not inside an extra parent folder.
2. Make a copy of that ZIP and change the copy's extension from `.zip` to `.seewall`. Enable file extensions in Windows Explorer if necessary.
3. Import the `.seewall` package in seeWallpaper.
4. Check the preview, desktop rendering, settings, pause/resume, and all performance profiles. Resize the preview to check narrower and wider layouts.
5. Export the tested wallpaper from the app if you want to submit an app-generated package.

For a new local scene, use an ID that is not already installed. Record your Windows version and tested display resolution for the submission.

**[Share your finished template](https://github.com/Hytachi182/seeWallpapers/blob/main/docs/wiki/Share-your-template.md)**
