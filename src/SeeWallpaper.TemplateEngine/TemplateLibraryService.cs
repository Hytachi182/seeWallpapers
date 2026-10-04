using System.Text.Json;
using SeeWallpaper.Core;

namespace SeeWallpaper.TemplateEngine;

public sealed class TemplateLibraryService(TemplateManifestValidator validator)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public async Task<InstalledTemplate> DuplicateAsync(InstalledTemplate template, string templatesRoot, CancellationToken cancellationToken = default)
    {
        EnsureManagedTemplate(template, templatesRoot);
        string copyId = FindCopyId(template.Manifest.Id, templatesRoot);
        string target = Path.Combine(templatesRoot, copyId);
        CopyDirectory(template.RootPath, target);
        TemplateManifest copied = template.Manifest with { Id = copyId, Name = $"{template.Manifest.Name} copy", Version = "1.0.0" };
        await using (FileStream stream = File.Create(Path.Combine(target, "manifest.json"))) await JsonSerializer.SerializeAsync(stream, copied, JsonOptions, cancellationToken);
        TemplateValidationResult validation = validator.Validate(copied, target);
        if (!validation.IsValid) { Directory.Delete(target, true); throw new InvalidDataException(string.Join(" ", validation.Errors)); }
        long size = Directory.EnumerateFiles(target, "*", SearchOption.AllDirectories).Sum(file => new FileInfo(file).Length);
        return new InstalledTemplate(copied, target, size);
    }

    public Task UninstallAsync(InstalledTemplate template, string templatesRoot, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureManagedTemplate(template, templatesRoot);
        Directory.Delete(template.RootPath, true);
        return Task.CompletedTask;
    }

    private static void EnsureManagedTemplate(InstalledTemplate template, string templatesRoot)
    {
        string root = Path.GetFullPath(templatesRoot).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string candidate = Path.GetFullPath(template.RootPath).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase) || Path.GetDirectoryName(candidate.TrimEnd(Path.DirectorySeparatorChar)) is null || !string.Equals(Path.GetDirectoryName(candidate.TrimEnd(Path.DirectorySeparatorChar)), root.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Only a direct template in the managed library can be modified.");
    }

    private static string FindCopyId(string templateId, string templatesRoot)
    {
        for (int index = 1; index < 10_000; index++)
        {
            string candidate = $"{templateId}-copy-{index}";
            if (!Directory.Exists(Path.Combine(templatesRoot, candidate))) return candidate;
        }
        throw new InvalidOperationException("No available id could be created for the duplicate.");
    }

    private static void CopyDirectory(string source, string target)
    {
        Directory.CreateDirectory(target);
        foreach (string file in Directory.EnumerateFiles(source)) File.Copy(file, Path.Combine(target, Path.GetFileName(file)), true);
        foreach (string directory in Directory.EnumerateDirectories(source)) CopyDirectory(directory, Path.Combine(target, Path.GetFileName(directory)));
    }
}
