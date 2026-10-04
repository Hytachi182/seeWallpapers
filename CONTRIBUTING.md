# Contributing

Keep responsibilities separated by project boundary, preserve nullable annotations, and add tests for template parsing or validation changes. Templates must be original or explicitly reusable, work offline, and expose only documented SDK capabilities.

Run `dotnet build seeWallpaper.sln` and `dotnet test seeWallpaper.sln` before opening a pull request. Test template packages must include a root-level manifest, safe relative paths, and a preview image.

Use the issue forms for bugs and feature requests. Include Windows version, screen configuration and application version when reporting rendering problems. For a pull request, explain the resulting behavior and the checks performed; attach screenshots when changing the interface.

Do not commit generated `dist/` files, downloaded prerequisites, caches or local validation captures. Public releases are built by GitHub Actions and attached to versioned releases. See [release instructions](docs/releasing.md).
