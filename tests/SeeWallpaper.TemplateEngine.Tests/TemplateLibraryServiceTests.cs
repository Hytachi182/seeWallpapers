using System.Text.Json;
using SeeWallpaper.Core;
using SeeWallpaper.TemplateEngine;
using Xunit;

namespace SeeWallpaper.TemplateEngine.Tests;

public sealed class TemplateLibraryServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-library-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Duplicate_creates_a_new_valid_template_and_uninstall_removes_it()
    {
        string library = Path.Combine(_root, "templates");
        InstalledTemplate original = await CreateTemplateAsync(library, "original-template");
        TemplateLibraryService service = new(new TemplateManifestValidator());

        InstalledTemplate duplicate = await service.DuplicateAsync(original, library);
        await service.UninstallAsync(duplicate, library);

        Assert.Equal("original-template-copy-1", duplicate.Manifest.Id);
        Assert.False(Directory.Exists(duplicate.RootPath));
        Assert.True(Directory.Exists(original.RootPath));
    }

    [Fact]
    public async Task Uninstall_refuses_a_template_outside_managed_library()
    {
        InstalledTemplate external = await CreateTemplateAsync(Path.Combine(_root, "external"), "external-template");

        await Assert.ThrowsAsync<InvalidOperationException>(() => new TemplateLibraryService(new TemplateManifestValidator()).UninstallAsync(external, Path.Combine(_root, "templates")));
        Assert.True(Directory.Exists(external.RootPath));
    }

    private static async Task<InstalledTemplate> CreateTemplateAsync(string library, string id)
    {
        string root = Path.Combine(library, id);
        Directory.CreateDirectory(root);
        TemplateManifest manifest = new(1, id, "Test", "Test template", "Test", "1.0.0", "Tech", "web", "index.html", "preview.jpg", "low", []);
        await File.WriteAllTextAsync(Path.Combine(root, "manifest.json"), JsonSerializer.Serialize(manifest));
        await File.WriteAllTextAsync(Path.Combine(root, "index.html"), "<!doctype html>");
        await File.WriteAllBytesAsync(Path.Combine(root, "preview.jpg"), [1]);
        return new InstalledTemplate(manifest, root, 1);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }
}
