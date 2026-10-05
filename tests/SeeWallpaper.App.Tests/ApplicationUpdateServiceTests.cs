using System.IO;
using System.Net;
using System.Net.Http;
using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class ApplicationUpdateServiceTests
{
    [Theory]
    [InlineData("1.4.0", "1.4.0.0")]
    [InlineData("1.3.9", "1.4.0.0")]
    public async Task Current_or_older_main_does_not_offer_an_update(string main, string installed)
    {
        using HttpClient http = CreateClient(main, (_, _) => throw new InvalidOperationException("No release request expected."));
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version(installed));
        Assert.False(result.UpdateAvailable);
        Assert.Null(result.ReleaseUrl);
    }

    [Fact]
    public async Task Newer_main_offers_its_matching_published_release()
    {
        using HttpClient http = CreateClient("1.10.0", (request, _) =>
        {
            Assert.Equal("https://api.github.com/repos/Hytachi182/seeWallpapers/releases/tags/v1.10.0", request.RequestUri!.AbsoluteUri);
            return new(HttpStatusCode.OK) { Content = new StringContent("""
                {"draft":false,"prerelease":false,"assets":[{"name":"seeWallpaper-Setup-x64.exe"}]}
                """) };
        });
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version("1.9.0.0"));
        Assert.True(result.UpdateAvailable);
        Assert.Equal("https://github.com/Hytachi182/seeWallpapers/releases/tag/v1.10.0", result.ReleaseUrl!.AbsoluteUri);
    }

    [Fact]
    public async Task Unpublished_main_still_reports_newer_version_without_a_download()
    {
        using HttpClient http = CreateClient("1.5.0", (_, _) => new(HttpStatusCode.NotFound));
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0"));
        Assert.True(result.UpdateAvailable);
        Assert.Null(result.ReleaseUrl);
    }

    [Theory]
    [InlineData(true, false, "seeWallpaper-Setup-x64.exe")]
    [InlineData(false, true, "seeWallpaper-Setup-x64.exe")]
    [InlineData(false, false, "source.zip")]
    public async Task Draft_prerelease_or_missing_windows_assets_do_not_offer_a_download(bool draft, bool prerelease, string asset)
    {
        using HttpClient http = CreateClient("1.5.0", (_, _) => new(HttpStatusCode.OK)
        {
            Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new
            {
                draft, prerelease, assets = new[] { new { name = asset } }
            }))
        });
        ApplicationUpdateResult result = await new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0"));
        Assert.True(result.UpdateAvailable);
        Assert.Null(result.ReleaseUrl);
    }

    [Fact]
    public async Task Invalid_remote_version_is_an_error_instead_of_up_to_date()
    {
        using HttpClient http = CreateClient("unknown", (_, _) => new(HttpStatusCode.NotFound));
        await Assert.ThrowsAsync<InvalidDataException>(() => new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0")));
    }

    [Theory]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task Github_errors_are_not_reported_as_no_update(HttpStatusCode status)
    {
        using HttpClient http = new(new FakeHandler((_, _) => new(status)));
        await Assert.ThrowsAsync<HttpRequestException>(() => new ApplicationUpdateService(http).CheckAsync(new Version("1.4.0")));
    }

    private static HttpClient CreateClient(string main, Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> release) =>
        new(new FakeHandler((request, token) => request.RequestUri!.Host == "raw.githubusercontent.com"
            ? new(HttpStatusCode.OK) { Content = new StringContent($"<Project><PropertyGroup><Version>{main}</Version></PropertyGroup></Project>") }
            : release(request, token)));

    private sealed class FakeHandler(Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(respond(request, cancellationToken));
    }
}
