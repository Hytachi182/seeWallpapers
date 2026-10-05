# Publish a release

Binaries are distributed through GitHub Releases; `dist/` and build caches stay out of Git history.

## One PR from devops to main

Push your completed work to `devops` and open one pull request from **devops into main**. **Prepare and publish devops release** commits the version, template versions, catalogue, README, changelog, release notes and release plan directly to `devops`. These changes appear in your existing PR. The workflow does not create another PR or merge yours.

Preparation compares the source with the latest published stable tag. A new wallpaper or `feat:` commit increments the minor version; other application/package/template changes increment the patch version; `feat!:` or `BREAKING CHANGE:` requests a major version. A higher pending application version is retained. Documentation-only changes do not publish an application release. Authored notes and hardware limitations are preserved outside generated markers.

Wait for preparation and the required **build-and-test** check before merging. CI verifies that the PR includes prepared metadata and has no newer source changes awaiting preparation. GitHub-token pushes do not automatically start CI, so preparation dispatches CI for the exact generated commit on `devops`. Pull the generated commit before your next local push; no force push is needed.

After you merge that **devops ? main** PR, the same workflow builds and checks the installer, ZIP and checksums at its merged commit. Only after packaging succeeds does it create the tag and publish the GitHub release. There is no second PR and publication does not start another preparation. Pushes to `devops` prepare metadata; they do not publish downloads. Closing an unmerged PR or merging another branch does not publish a release.

Existing tags and stable assets remain immutable. A failed draft publication can be retried using the original workflow run and commit. A released older version never replaces a newer latest release. Preparation fails with a clear message while an earlier version on `main` is still awaiting publication; rerun its failed job once that publication finishes. Concurrent source changes stop a stale preparation before it can push.

Main protection and review remain in place. The workflow needs contents/actions write permissions for its generated `devops` commit and CI dispatch, plus publication permissions after merge. It does not require permission to create pull requests.

### Preview without publishing

Run **Prepare and publish devops release** on `main` with **dry_run** enabled to preview `devops` metadata in an artifact. No commit is pushed and nothing is published. The manual form also supports an explicit patch, minor or major increment.

For a local preview, use a disposable checkout because generation updates its files:

```powershell
python build/release_metadata.py --base-ref vX.Y.Z --repository Hytachi182/seeWallpapers
python -m unittest discover -s build/tests -p test_release_automation.py
```

The base ref must be the latest published stable tag. Review the [release validation record](release-readiness.md) and current notes before merging your PR.

## Manual tags and package verification

The local app's **Check update** button compares the installed assembly version with the latest published stable GitHub release containing Windows packages and checksums. **Install and restart** downloads the matching installer or portable ZIP, verifies SHA-256, applies the update after exit, and reopens the app. Versions present only in source are not offered. See [application updates](application-updates.md) for the update flow and the one-time manual upgrade required by older binaries.

1. Update `Version` in `src/SeeWallpaper.App/SeeWallpaper.App.csproj` and the changelog.
2. Add release notes in `docs/releases/vX.Y.Z.md`.
3. Build and test on Windows, then merge the reviewed commit into `main` through a pull request. For the normal devops PR path, the workflow publishes automatically; do not create an additional manual tag.
4. Create and push a tag matching the version exactly:

```powershell
git tag -a vX.Y.Z -m 'seeWallpaper X.Y.Z'
git push origin vX.Y.Z
```

The **Windows release** workflow checks the tag, builds and tests the app, produces the installer and ZIP, runs their checks, and publishes the release. Publication starts only after packaging succeeds. Asset names stay fixed for README links:

- `seeWallpaper-Setup-x64.exe`
- `seeWallpaper-Portable-x64.zip`
- `SHA256SUMS.txt`

The `releases/latest/download/...` links follow the latest stable release. Do not publish a test build as stable. A manual workflow run produces an artifact retained for 30 days without publishing a release.

## Local verification

```powershell
dotnet test seeWallpaper.sln
.\build\build-installer.ps1
.\build\test-installer.ps1
.\build\build-portable.ps1
.\build\test-portable.ps1
.\build\prepare-release.ps1
```

Installer tests refuse to replace an existing personal installation or integration. Real desktop and monitor checks require an interactive workstation and remain separate from CI checks.

Release notes must state hardware limitations and missing validations. Publisher signing requires a certificate owned by the publisher; current files are distributed without that signature.

Before broadly promoting future releases, complete the outstanding checks in [release readiness](release-readiness.md). Legacy independent display assignments require a new wallpaper selection once after upgrading to monitor device interface identities; mention this in the release notes. Keep the README source version and publication status current after each release.
