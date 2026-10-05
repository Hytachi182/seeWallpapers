using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class ApplicationUpdateServiceTests
{
    [Theory]
    [InlineData("1.4.0", "1.4.0.0", false)]
    [InlineData("1.3.9", "1.4.0.0", false)]
    [InlineData("1.10.0", "1.9.0.0", true)]
    public async Task Compares_published_versions_numerically(string published, string installed, bool available)
    {
        using HttpClient http = CreateClient(published);
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version(installed));
        Assert.Equal(available, result.UpdateAvailable);
        Assert.Equal($"https://github.com/Hytachi182/seeWallpapers/releases/tag/v{published}", result.ReleaseUrl!.AbsoluteUri);
        Assert.Equal("seeWallpaper-Setup-x64.exe", result.Installer!.Name);
        Assert.NotNull(result.Portable);
        Assert.NotNull(result.ChecksumsUrl);
    }

    [Fact]
    public async Task No_published_release_does_not_offer_an_unreleased_main_version()
    {
        using HttpClient http = new(new FakeHandler(_ => new(HttpStatusCode.NotFound)));
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0"));
        Assert.False(result.UpdateAvailable);
        Assert.Null(result.ReleaseUrl);
    }

    [Theory]
    [InlineData(true, false, false, false)]
    [InlineData(false, true, false, false)]
    [InlineData(false, false, true, false)]
    [InlineData(false, false, false, true)]
    public async Task Unusable_releases_are_not_offered(bool draft, bool prerelease, bool missingWindows, bool missingChecksums)
    {
        using HttpClient http = CreateClient("1.5.0", draft, prerelease, missingWindows, missingChecksums);
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0"));
        Assert.False(result.UpdateAvailable);
        Assert.Null(result.ReleaseUrl);
    }

    [Theory]
    [InlineData("http://github.com/Hytachi182/seeWallpapers/releases/download/v1.5.0/")]
    [InlineData("https://example.org/Hytachi182/seeWallpapers/releases/download/v1.5.0/")]
    [InlineData("https://github.com/other/repo/releases/download/v1.5.0/")]
    public async Task Rejects_downloads_outside_the_official_release(string prefix)
    {
        using HttpClient http = CreateClient("1.5.0", prefix: prefix);
        await Assert.ThrowsAsync<InvalidDataException>(() => new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0")));
    }

    [Fact]
    public async Task Invalid_release_version_is_an_error()
    {
        using HttpClient http = CreateClient("unknown");
        await Assert.ThrowsAsync<InvalidDataException>(() => new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0")));
    }

    [Theory]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task Github_errors_are_not_reported_as_no_update(HttpStatusCode status)
    {
        using HttpClient http = new(new FakeHandler(_ => new(status)));
        await Assert.ThrowsAsync<HttpRequestException>(() => new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0")));
    }

    private static HttpClient CreateClient(string version, bool draft = false, bool prerelease = false,
        bool missingWindows = false, bool missingChecksums = false, string? prefix = null) => new(new FakeHandler(request =>
    {
        Assert.Equal("https://api.github.com/repos/Hytachi182/seeWallpapers/releases/latest", request.RequestUri!.AbsoluteUri);
        string[] names = missingWindows ? ["source.zip", "SHA256SUMS.txt"] : ["seeWallpaper-Setup-x64.exe", "seeWallpaper-Portable-x64.zip", "SHA256SUMS.txt"];
        return new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new
        {
            tag_name = "v" + version, draft, prerelease,
            assets = names.Where(name => !missingChecksums || name != "SHA256SUMS.txt").Select(name => new
            {
                name, size = 100, browser_download_url = (prefix ?? $"https://github.com/Hytachi182/seeWallpapers/releases/download/v{version}/") + name
            })
        })) };
    }));

    private sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(respond(request));
    }
}
