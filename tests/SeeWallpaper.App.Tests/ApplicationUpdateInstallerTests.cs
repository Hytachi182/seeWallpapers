using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class ApplicationUpdateInstallerTests
{
    [Theory]
    [InlineData("missing")]
    [InlineData("invalid  seeWallpaper-Setup-x64.exe")]
    public void Missing_or_invalid_checksums_are_rejected(string text) =>
        Assert.Throws<InvalidDataException>(() => ApplicationUpdateInstaller.ReadChecksum(text, "seeWallpaper-Setup-x64.exe"));

    [Fact]
    public void Duplicate_checksums_are_rejected()
    {
        string line = new string('a', 64) + "  seeWallpaper-Setup-x64.exe\n";
        Assert.Throws<InvalidDataException>(() => ApplicationUpdateInstaller.ReadChecksum(line + line, "seeWallpaper-Setup-x64.exe"));
    }

    [Theory]
    [InlineData("bad", false)]
    [InlineData("good", true)]
    public async Task Only_verified_downloads_are_staged_and_the_installation_stays_intact(string body, bool valid)
    {
        string root = TemporaryDirectory();
        try
        {
            string app = Path.Combine(root, "app");
            Directory.CreateDirectory(app);
            File.WriteAllText(Path.Combine(app, "unins000.exe"), "marker");
            File.WriteAllText(Path.Combine(app, "keep.txt"), "original");
            using HttpClient http = new(new DownloadHandler(body));
            ApplicationUpdateResult update = new(new Version("1.4.0"), new Version("1.5.0"), null)
            {
                Installer = new("seeWallpaper-Setup-x64.exe", new Uri("https://github.com/setup"), body.Length),
                ChecksumsUrl = new Uri("https://github.com/SHA256SUMS.txt")
            };
            Task<string> prepare = new ApplicationUpdateInstaller(http).PrepareAsync(update, app, Path.Combine(root, "updates"));
            if (!valid)
            {
                await Assert.ThrowsAsync<InvalidDataException>(() => prepare);
                Assert.Empty(Directory.GetDirectories(Path.Combine(root, "updates")));
            }
            else
            {
                string work = await prepare;
                Assert.True(File.Exists(Path.Combine(work, "UpdateRunner.ps1")));
                Assert.True(File.Exists(Path.Combine(work, "update.json")));
                Assert.Equal("good", File.ReadAllText(Path.Combine(work, "seeWallpaper-Setup-x64.exe")));
                Assert.False(File.Exists(Path.Combine(work, "ready")));
            }
            Assert.Equal("original", File.ReadAllText(Path.Combine(app, "keep.txt")));
        }
        finally { Directory.Delete(root, true); }
    }

    [Theory]
    [InlineData("../outside.exe")]
    [InlineData("folder/../../outside.exe")]
    [InlineData("folder/file:stream")]
    public void Portable_archive_cannot_escape_staging(string entry)
    {
        string root = TemporaryDirectory();
        try
        {
            string zip = Path.Combine(root, "package.zip");
            using (ZipArchive archive = ZipFile.Open(zip, ZipArchiveMode.Create)) archive.CreateEntry(entry);
            Assert.Throws<InvalidDataException>(() => ApplicationUpdateInstaller.ExtractPortable(zip, Path.Combine(root, "payload")));
            Assert.False(File.Exists(Path.Combine(root, "outside.exe")));
        }
        finally { Directory.Delete(root, true); }
    }

    private static string TemporaryDirectory()
    {
        string root = Path.Combine(Path.GetTempPath(), "seeWallpaper-update-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private sealed class DownloadHandler(string content) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string body = request.RequestUri!.AbsolutePath.EndsWith("SHA256SUMS.txt", StringComparison.Ordinal)
                ? Convert.ToHexString(SHA256.HashData("good"u8)) + "  seeWallpaper-Setup-x64.exe\n" : content;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
        }
    }
}
