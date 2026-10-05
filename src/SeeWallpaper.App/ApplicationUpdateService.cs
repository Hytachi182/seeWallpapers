using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;

namespace SeeWallpaper.App;

internal sealed record ApplicationUpdateResult(Version InstalledVersion, Version MainVersion, Uri? ReleaseUrl)
{
    public bool UpdateAvailable => MainVersion > InstalledVersion;
    public ApplicationUpdateAsset? Installer { get; init; }
    public ApplicationUpdateAsset? Portable { get; init; }
    public Uri? ChecksumsUrl { get; init; }
}

internal sealed record ApplicationUpdateAsset(string Name, Uri Url, long Size);

/// <summary>Offers only stable releases whose Windows downloads are published.</summary>
internal sealed class ApplicationUpdateService(HttpClient http)
{
    private const string Repository = "Hytachi182/seeWallpapers";

    public async Task<ApplicationUpdateResult> CheckAsync(Version installedVersion, CancellationToken cancellationToken = default)
    {
        using HttpResponseMessage response = await http.GetAsync(
            $"https://api.github.com/repos/{Repository}/releases/latest", cancellationToken);
        installedVersion = Normalize(installedVersion);
        if (response.StatusCode == HttpStatusCode.NotFound) return new(installedVersion, installedVersion, null);
        response.EnsureSuccessStatusCode();
        using JsonDocument release = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        JsonElement root = release.RootElement;
        string? declaredVersion = root.GetProperty("tag_name").GetString()?.TrimStart('v');
        if (!Version.TryParse(declaredVersion, out Version? mainVersion))
            throw new InvalidDataException("GitHub release does not declare a valid application version.");

        // Assembly versions include a fourth component; published versions normally have three.
        mainVersion = Normalize(mainVersion);
        if (root.GetProperty("draft").GetBoolean() || root.GetProperty("prerelease").GetBoolean())
            return new(installedVersion, installedVersion, null);
        ApplicationUpdateAsset? Find(string name)
        {
            foreach (JsonElement asset in root.GetProperty("assets").EnumerateArray())
            {
                if (asset.GetProperty("name").GetString() != name) continue;
                Uri url = new(asset.GetProperty("browser_download_url").GetString()!);
                if (url.Scheme != "https" || url.Host != "github.com"
                    || !url.AbsolutePath.StartsWith($"/{Repository}/releases/download/v{declaredVersion}/", StringComparison.Ordinal)
                    || asset.GetProperty("size").GetInt64() <= 0)
                    throw new InvalidDataException("Invalid official release download.");
                return new(name, url, asset.GetProperty("size").GetInt64());
            }
            return null;
        }
        ApplicationUpdateAsset? installer = Find("seeWallpaper-Setup-x64.exe");
        ApplicationUpdateAsset? portable = Find("seeWallpaper-Portable-x64.zip");
        ApplicationUpdateAsset? checksums = Find("SHA256SUMS.txt");
        if (checksums is null || (installer is null && portable is null)) return new(installedVersion, installedVersion, null);
        return new(installedVersion, mainVersion, new Uri($"https://github.com/{Repository}/releases/tag/v{declaredVersion}"))
        { Installer = installer, Portable = portable, ChecksumsUrl = checksums.Url };
    }

    private static Version Normalize(Version version) => new(version.Major, version.Minor, Math.Max(0, version.Build), Math.Max(0, version.Revision));
}
