# Share your template

**[Open the wallpaper submission form](https://github.com/Hytachi182/seeWallpapers/issues/new?template=template_submission.yml)**

You only need a GitHub account, your tested scene, and a screenshot. No Git commands, fork, or repository write access are needed for this route.

## Prepare your upload

Choose either format:

- **Source ZIP:** `manifest.json`, the HTML entry, preview image, and all local assets at the archive root.
- **Exported package:** export the wallpaper as `.seewall` from seeWallpaper, then place that file inside a ZIP for upload. The maintainer extracts the `.seewall` before importing it.

Include licence notices for reused assets. Do not include build output or unrelated files.

GitHub accepts ZIP attachments up to **25 MB** and image attachments up to **10 MB**. For a larger package, provide a downloadable file from your own GitHub repository or release in the form. See [GitHub attachment limits](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).

## Submit in your browser

1. Sign in and [open the form](https://github.com/Hytachi182/seeWallpapers/issues/new?template=template_submission.yml).
2. Enter the wallpaper name, manifest ID, creator name, description, and whether this is a new scene or an update.
3. Drag your ZIP into **Template ZIP** and wait for its upload link to appear.
4. Drag a screenshot into **Screenshot or short recording**.
5. List asset sources and licences, describe your test environment, and confirm the checklist.
6. Click **Submit new issue**.

The submission and its attachments are public. The package is available for community discussion immediately, but submitting it does **not** automatically add it to the app's official catalogue.

## After submitting

The maintainer checks the files and licences, tests the scene, and may request changes in the issue. Attach a revised ZIP in a reply if needed. Once accepted, the maintainer adds the scene through a pull request into protected `main`.

See [catalogue and review](https://github.com/Hytachi182/seeWallpapers/blob/main/docs/wiki/Catalogue-and-review.md) for publication and update details.

## Prefer a pull request?

Experienced contributors can still submit `templates/<id>/` from a fork. Follow the [contribution guide](https://github.com/Hytachi182/seeWallpapers/blob/main/CONTRIBUTING.md) and include a screenshot, licence information, and test results.
