# Publish a release

Binaries are distributed through GitHub Releases; `dist/` and build caches stay out of Git history.

## Automatic devops promotion

Push your completed work to `devops`. **Promote devops to main** prepares or updates a pull request from `release/devops-to-main` into protected `main`; it never merges the PR for you. The preparation branch contains a reviewed snapshot of both `main` and `devops`, so community contributions already on `main` are retained. Conflicting edits stop preparation instead of discarding either branch's changes.

The pipeline compares the snapshot with the latest published stable tag and updates:

- Application `Version` and the future `vX.Y.Z` tag recorded in the release plan.
- Versions of changed existing wallpapers, so installed copies can receive Online update offers; explicit higher template versions are retained.
- The generated catalogue in `docs/template-catalogue.md`, including all scene previews, names, categories, creators, and versions.
- README source version and catalogue count, changelog, and `docs/releases/vX.Y.Z.md`.
- The promotion PR title and description, including the source commit and publication behavior.

Notes list added, updated, and removed wallpapers using their manifests, plus development commit subjects and a comparison link. Authored release notes and hardware acceptance limitations remain outside the generated markers and are preserved. Commit messages therefore contribute to the description: use descriptive subjects; `feat:` requests a minor version and `feat!:` or `BREAKING CHANGE:` requests a major version.

Version selection in **auto** mode: a new wallpaper or a conventional feature commit increments the minor version; other application/package/template changes increment the patch version; breaking changes increment the major version. An already authored higher pending application version is retained. Documentation-only changes do not produce a new application release. You can override the increment with `patch`, `minor`, or `major` in the workflow's **Run workflow** form on `main`.

Review the generated PR, notes, and outstanding real-desktop acceptance. After you merge the promotion PR, the reusable **Windows release** workflow builds and checks the installer, portable ZIP, and checksums at that exact merged commit. Only after those checks pass does it create the matching tag, upload files to a draft release, and publish the stable release. Local documentation links in the notes are converted into links to files at that release's tag.

Existing tags are never moved, and published stable assets are never overwritten. A failed draft publication can be retried at its original commit. An older release cannot replace a newer release as **latest**. Devops changes arriving during packaging are picked up after successful publication; another preparation waits while a reviewed version on `main` is still awaiting publication.

The required CI check remains `build-and-test`. Because pushes made with `GITHUB_TOKEN` do not automatically start push workflows, preparation explicitly dispatches CI on the promotion branch at its recorded immutable SHA. A changed branch tip fails that dispatched check rather than checking a different revision.

When GitHub holds the bot-created PR workflow for execution approval, preparation authorizes only the CI workflow for its own repository, reserved promotion branch, exact head SHA, and PR number. That allows the PR merge-commit checks to run as well as the explicitly dispatched head checks. It does not approve a code review, merge a PR, or authorize workflows from forks.

The repository must allow GitHub Actions to create pull requests. The workflow uses the short-lived `GITHUB_TOKEN` with job-specific permissions, without a personal token secret. Main protection, user-controlled merge, and CI requirements still apply. The workflow does not automatically approve or merge pull requests.

### Preview without publishing

Run **Promote devops to main** on `main` with **dry_run** enabled. Metadata is generated in the runner and uploaded as a review artifact; no branch push, PR, tag, release, or download is published. This can also prepare the first pending version when there are no new devops commits to merge.

For a local preview, use a disposable checkout, since generation updates files there:

```powershell
python build/release_metadata.py --base-ref v1.4.0 --repository Hytachi182/seeWallpapers
python -m unittest discover -s build/tests -p test_release_automation.py
```

Automation installation does not publish the pending 1.5.0 application. That release still requires reviewing [release readiness](release-readiness.md) and merging its prepared promotion PR.

## Manual tags and package verification

The app's **Check update** button compares the installed assembly version with `Version` in the app project on GitHub `main`. A newer version displays a warning. **Download update** opens that version's official release page when a stable release with Windows binaries exists. Users choose the installer or ZIP and install it themselves; the app does not replace running files. A version present only on `main` is shown as awaiting publication. Changes without a version bump are not considered a new application version. Network or GitHub errors show retry guidance.

1. Update `Version` in `src/SeeWallpaper.App/SeeWallpaper.App.csproj` and the changelog.
2. Add release notes in `docs/releases/vX.Y.Z.md`.
3. Build and test on Windows, then merge the reviewed commit into `main` through a pull request.
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

Before promoting 1.5.0 broadly, complete the outstanding checks in [release readiness](release-readiness.md). Legacy independent display assignments require a new wallpaper selection once after upgrading to monitor device interface identities; mention this in the release notes. After publication, remove the pending-release notice in the README and update the readiness publication status.
