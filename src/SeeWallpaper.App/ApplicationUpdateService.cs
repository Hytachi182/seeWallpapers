using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Xml.Linq;

namespace SeeWallpaper.App;

internal sealed record ApplicationUpdateResult(Version InstalledVersion, Version MainVersion, Uri? ReleaseUrl)
{
    public bool UpdateAvailable => MainVersion > InstalledVersion;
}

/// <summary>Checks main without requiring Git or modifying the installation.</summary>
internal sealed class ApplicationUpdateService(HttpClient http)
{
    private const string Repository = "Hytachi182/seeWallpapers";

    public async Task<ApplicationUpdateResult> CheckAsync(Version installedVersion, CancellationToken cancellationToken = default)
    {
        string project = await http.GetStringAsync(
            $"https://raw.githubusercontent.com/{Repository}/main/src/SeeWallpaper.App/SeeWallpaper.App.csproj", cancellationToken);
        string? declaredVersion = XDocument.Parse(project).Descendants("Version").SingleOrDefault()?.Value.Trim();
        if (!Version.TryParse(declaredVersion, out Version? mainVersion))
            throw new InvalidDataException("GitHub main does not declare a valid application version.");

        // Assembly versions include a fourth component; published versions normally have three.
        installedVersion = Normalize(installedVersion);
        mainVersion = Normalize(mainVersion);
        Uri? releaseUrl = null;
        if (mainVersion > installedVersion)
        {
            using HttpResponseMessage response = await http.GetAsync(
                $"https://api.github.com/repos/{Repository}/releases/tags/v{declaredVersion}", cancellationToken);
            if (response.StatusCode != HttpStatusCode.NotFound)
            {
                response.EnsureSuccessStatusCode();
                using JsonDocument release = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
                JsonElement root = release.RootElement;
                if (!root.GetProperty("draft").GetBoolean() && !root.GetProperty("prerelease").GetBoolean()
                    && root.GetProperty("assets").EnumerateArray().Any(asset =>
                        asset.GetProperty("name").GetString() is "seeWallpaper-Setup-x64.exe" or "seeWallpaper-Portable-x64.zip"))
                    releaseUrl = new Uri($"https://github.com/{Repository}/releases/tag/v{declaredVersion}");
            }
        }
        return new(installedVersion, mainVersion, releaseUrl);
    }

    private static Version Normalize(Version version) => new(version.Major, version.Minor, Math.Max(0, version.Build), Math.Max(0, version.Revision));
}
