# Publish a release

Binaries are distributed through GitHub Releases; `dist/` and build caches stay out of Git history.

1. Update `Version` in `src/SeeWallpaper.App/SeeWallpaper.App.csproj` and the changelog.
2. Add release notes in `docs/releases/vX.Y.Z.md`.
3. Build and test on Windows, then push the commit to the repository.
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
