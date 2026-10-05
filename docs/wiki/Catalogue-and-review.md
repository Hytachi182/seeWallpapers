# Catalogue and review

## Review before publication

A submission is a proposal. The maintainer checks:

- The manifest, unique ID, entry, preview, and package contents.
- Permission to redistribute the code and assets, including any required licence notices.
- Offline operation, preview and desktop rendering, and available settings.
- Pause/resume and the requested performance profiles.

Automated manifest checks support this review; they do not prove rendering quality or asset permissions. An attachment's presence alone is not approval to run or publish it.

## Add an accepted scene

The maintainer adds the reviewed files under `templates/<id>/` on a branch, opens a pull request, and merges after CI passes and outstanding discussions are resolved. `main` requires pull requests and a passing `build-and-test` check. Force pushes and branch deletion are blocked.

Once the scene is merged, the app's **Online** catalogue picks it up at startup or its next periodic check, normally every six hours while running. A new app release is not needed for catalogue publication. A version of seeWallpaper with the Online feature is required.

The scene's `author` remains visible in its manifest and catalogue metadata.

## Update your wallpaper

Keep the original template ID and author, increase the version, and submit an updated package using the [same form](https://github.com/Hytachi182/seeWallpapers/issues/new?template=template_submission.yml). Link the previous submission if available and explain what changed.

Existing installations are offered an update once the reviewed version is published. Updating someone else's scene requires agreement with its creator or the maintainer.
