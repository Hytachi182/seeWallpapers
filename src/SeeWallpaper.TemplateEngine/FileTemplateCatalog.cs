using System.Text.Json;
using SeeWallpaper.Core;

namespace SeeWallpaper.TemplateEngine;

public sealed class FileTemplateCatalog(TemplateManifestValidator validator) : ITemplateCatalog
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<IReadOnlyList<InstalledTemplate>> DiscoverAsync(string templatesRoot, CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(templatesRoot)) return Array.Empty<InstalledTemplate>();
        List<InstalledTemplate> templates = [];
        foreach (string directory in Directory.EnumerateDirectories(templatesRoot))
        {
            string manifestPath = Path.Combine(directory, "manifest.json");
            if (!File.Exists(manifestPath)) continue;
            await using FileStream stream = File.OpenRead(manifestPath);
            TemplateManifest? manifest = await JsonSerializer.DeserializeAsync<TemplateManifest>(stream, JsonOptions, cancellationToken);
            if (manifest is null || !validator.Validate(manifest, directory).IsValid) continue;
            long size = Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories).Sum(file => new FileInfo(file).Length);
            templates.Add(new InstalledTemplate(manifest, directory, size));
        }
        return templates.OrderBy(template => template.Manifest.Name).ToArray();
    }
}
