using System.IO.Compression;
using SeeWallpaper.TemplateEngine;
using Xunit;

namespace SeeWallpaper.TemplateEngine.Tests;

public sealed class TemplatePackageServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-package-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Import_then_export_preserves_a_valid_template()
    {
        string source = CreateTemplateDirectory();
        string package = Path.Combine(_root, "source.seewall");
        ZipFile.CreateFromDirectory(source, package);
        TemplatePackageService service = new(new TemplateManifestValidator());

        SeeWallpaper.Core.InstalledTemplate imported = await service.ImportAsync(package, Path.Combine(_root, "installed"));
        string exported = Path.Combine(_root, "exported.seewall");
        await service.ExportAsync(imported, exported);

        using ZipArchive archive = ZipFile.OpenRead(exported);
        Assert.NotNull(archive.GetEntry("manifest.json"));
        Assert.NotNull(archive.GetEntry("index.html"));
        Assert.NotNull(archive.GetEntry("preview.jpg"));
    }

    [Fact]
    public async Task Import_rejects_path_traversal()
    {
        Directory.CreateDirectory(_root);
        string package = Path.Combine(_root, "unsafe.seewall");
        using (ZipArchive archive = ZipFile.Open(package, ZipArchiveMode.Create))
        await using (StreamWriter writer = new(archive.CreateEntry("../outside.txt").Open()))
            await writer.WriteAsync("no");
        TemplatePackageService service = new(new TemplateManifestValidator());

        await Assert.ThrowsAsync<InvalidDataException>(() => service.ImportAsync(package, Path.Combine(_root, "installed")));
        Assert.False(File.Exists(Path.Combine(_root, "outside.txt")));
    }

    private string CreateTemplateDirectory()
    {
        string source = Path.Combine(_root, "source");
        Directory.CreateDirectory(source);
        File.WriteAllText(Path.Combine(source, "manifest.json"), "{\"schemaVersion\":1,\"id\":\"test-template\",\"name\":\"Test\",\"description\":\"Test template\",\"author\":\"Test\",\"version\":\"1.0.0\",\"category\":\"Tech\",\"engine\":\"web\",\"entry\":\"index.html\",\"preview\":\"preview.jpg\",\"performance\":\"low\",\"settings\":[]}");
        File.WriteAllText(Path.Combine(source, "index.html"), "<!doctype html><title>Test</title>");
        File.WriteAllBytes(Path.Combine(source, "preview.jpg"), [1, 2, 3]);
        return source;
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }
}
