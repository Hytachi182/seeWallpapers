using System.IO.Compression;
using System.Text.Json;
using SeeWallpaper.Core;

namespace SeeWallpaper.TemplateEngine;

public sealed class TemplatePackageService(TemplateManifestValidator validator)
{
    public const string PackageExtension = ".seewall";
    private const long MaximumPackageBytes = 100L * 1024 * 1024;
    private const long MaximumUncompressedBytes = 250L * 1024 * 1024;
    private const int MaximumFileCount = 500;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<InstalledTemplate> ImportAsync(string packagePath, string templatesRoot, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(packagePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(templatesRoot);
        if (!string.Equals(Path.GetExtension(packagePath), PackageExtension, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException($"A {PackageExtension} package is required.");
        FileInfo package = new(packagePath);
        if (!package.Exists) throw new FileNotFoundException("The package could not be found.", packagePath);
        if (package.Length > MaximumPackageBytes) throw new InvalidDataException("The package exceeds the 100 MB size limit.");

        string stagingRoot = Path.Combine(Path.GetTempPath(), "seeWallpaper", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(stagingRoot);
        try
        {
            using ZipArchive archive = ZipFile.OpenRead(packagePath);
            ValidateArchive(archive, stagingRoot);
            foreach (ZipArchiveEntry entry in archive.Entries.Where(entry => !string.IsNullOrEmpty(entry.Name)))
            {
                cancellationToken.ThrowIfCancellationRequested();
                string targetPath = ResolveSafePath(stagingRoot, entry.FullName);
                Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
                await using Stream input = entry.Open();
                await using FileStream output = File.Create(targetPath);
                await input.CopyToAsync(output, cancellationToken);
            }

            TemplateManifest manifest = await ReadManifestAsync(stagingRoot, cancellationToken);
            TemplateValidationResult validation = validator.Validate(manifest, stagingRoot);
            if (!validation.IsValid) throw new InvalidDataException(string.Join(" ", validation.Errors));
            Directory.CreateDirectory(templatesRoot);
            string targetDirectory = Path.Combine(Path.GetFullPath(templatesRoot), manifest.Id);
            if (Directory.Exists(targetDirectory)) throw new InvalidOperationException($"Template '{manifest.Id}' is already installed.");
            Directory.Move(stagingRoot, targetDirectory);
            stagingRoot = string.Empty;
            return new InstalledTemplate(manifest, targetDirectory, Directory.EnumerateFiles(targetDirectory, "*", SearchOption.AllDirectories).Sum(file => new FileInfo(file).Length));
        }
        finally
        {
            if (!string.IsNullOrEmpty(stagingRoot) && Directory.Exists(stagingRoot)) Directory.Delete(stagingRoot, true);
        }
    }

    public async Task ExportAsync(InstalledTemplate template, string packagePath, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(template);
        if (string.IsNullOrWhiteSpace(packagePath)) throw new ArgumentException("An export path is required.", nameof(packagePath));
        if (!string.Equals(Path.GetExtension(packagePath), PackageExtension, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException($"Exports must use {PackageExtension}.");
        TemplateValidationResult validation = validator.Validate(template.Manifest, template.RootPath);
        if (!validation.IsValid) throw new InvalidDataException(string.Join(" ", validation.Errors));
        string temporaryPath = packagePath + ".tmp";
        try
        {
            using FileStream output = File.Create(temporaryPath);
            using ZipArchive archive = new(output, ZipArchiveMode.Create);
            foreach (string file in Directory.EnumerateFiles(template.RootPath, "*", SearchOption.AllDirectories))
            {
                cancellationToken.ThrowIfCancellationRequested();
                string relativePath = Path.GetRelativePath(template.RootPath, file).Replace('\\', '/');
                ZipArchiveEntry entry = archive.CreateEntry(relativePath, CompressionLevel.Optimal);
                await using Stream source = File.OpenRead(file);
                await using Stream destination = entry.Open();
                await source.CopyToAsync(destination, cancellationToken);
            }
            archive.Dispose();
            output.Dispose();
            File.Move(temporaryPath, packagePath, true);
        }
        finally
        {
            if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
        }
    }

    private static void ValidateArchive(ZipArchive archive, string stagingRoot)
    {
        if (archive.Entries.Count > MaximumFileCount) throw new InvalidDataException("The package contains too many files.");
        long expandedBytes = 0;
        foreach (ZipArchiveEntry entry in archive.Entries)
        {
            if (string.IsNullOrEmpty(entry.Name)) continue;
            ResolveSafePath(stagingRoot, entry.FullName);
            expandedBytes = checked(expandedBytes + entry.Length);
            if (expandedBytes > MaximumUncompressedBytes) throw new InvalidDataException("The package expands beyond the 250 MB limit.");
        }
    }

    private static string ResolveSafePath(string root, string archivePath)
    {
        if (string.IsNullOrWhiteSpace(archivePath) || Path.IsPathRooted(archivePath) || archivePath.Split('/', '\\').Any(segment => segment is ".." or "")) throw new InvalidDataException("The package contains an unsafe path.");
        string normalizedRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string target = Path.GetFullPath(Path.Combine(root, archivePath));
        if (!target.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("The package contains an unsafe path.");
        return target;
    }

    private static async Task<TemplateManifest> ReadManifestAsync(string root, CancellationToken cancellationToken)
    {
        string manifestPath = Path.Combine(root, "manifest.json");
        if (!File.Exists(manifestPath)) throw new InvalidDataException("The package does not contain manifest.json at its root.");
        await using FileStream stream = File.OpenRead(manifestPath);
        return await JsonSerializer.DeserializeAsync<TemplateManifest>(stream, JsonOptions, cancellationToken) ?? throw new InvalidDataException("manifest.json is invalid.");
    }
}
