using System.Text.Json;
using SeeWallpaper.Core;
using SeeWallpaper.TemplateEngine;
using Xunit;

namespace SeeWallpaper.TemplateEngine.Tests;

public sealed class TemplateManifestValidatorTests
{
    private static string TemplatesRoot => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "templates"));

    public static IEnumerable<object[]> RepositoryTemplates => Directory.GetDirectories(TemplatesRoot)
        .OrderBy(path => path, StringComparer.Ordinal)
        .Select(path => new object[] { Path.GetFileName(path) });

    [Theory]
    [MemberData(nameof(RepositoryTemplates))]
    public async Task Repository_manifest_is_valid_and_matches_its_folder(string templateId)
    {
        string root = Path.Combine(TemplatesRoot, templateId);
        await using FileStream stream = File.OpenRead(Path.Combine(root, "manifest.json"));
        TemplateManifest manifest = (await JsonSerializer.DeserializeAsync<TemplateManifest>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }))!;

        TemplateValidationResult result = new TemplateManifestValidator().Validate(manifest, root);

        Assert.True(result.IsValid, string.Join(Environment.NewLine, result.Errors));
        Assert.Equal(templateId, manifest.Id);
    }

    [Fact]
    public void Traversal_entry_is_rejected()
    {
        TemplateManifest manifest = new(1, "safe-template", "Safe", "Description", "Author", "1.0.0", "Tech", "web", "../index.html", "preview.jpg", "low", []);

        TemplateValidationResult result = new TemplateManifestValidator().Validate(manifest, Path.GetTempPath());

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Contains("safe relative path", StringComparison.Ordinal));
    }
}
