using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using SeeWallpaper.Core;

namespace SeeWallpaper.TemplateEngine;

public sealed record OnlineTemplateFile(string Path, long Size, string BlobSha);

/// <summary>A template published in the repository's templates folder.</summary>
public sealed record OnlineTemplate(TemplateManifest Manifest, string PreviewUrl, IReadOnlyList<OnlineTemplateFile> Files)
{
    public long SizeBytes => Files.Sum(file => file.Size);
}

/// <summary>
/// Lists and downloads templates straight from a GitHub repository: pushing a template folder to the default branch (HEAD) publishes it.
/// The Git tree gives every file's size and blob hash, so downloads are verified without a separate catalog file.
/// </summary>
public sealed class OnlineTemplateStore(HttpClient http, TemplateManifestValidator validator, string owner, string repository, string branch = "HEAD")
{
    private const string TemplatesFolder = "templates/";
    private const long MaximumTemplateBytes = 250L * 1024 * 1024;
    private const int MaximumFileCount = 500;
    private const int MaximumParallelDownloads = 6;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private string RawRoot => $"https://raw.githubusercontent.com/{owner}/{repository}/{branch}/";

    public async Task<IReadOnlyList<OnlineTemplate>> GetTemplatesAsync(CancellationToken cancellationToken = default)
    {
        using HttpRequestMessage request = new(HttpMethod.Get, $"https://api.github.com/repos/{owner}/{repository}/git/trees/{branch}?recursive=1");
        request.Headers.Accept.ParseAdd("application/vnd.github+json");
        using HttpResponseMessage response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        GitTree tree = await response.Content.ReadFromJsonAsync<GitTree>(JsonOptions, cancellationToken) ?? throw new InvalidDataException("GitHub returned an empty file list.");

        IEnumerable<IGrouping<string, (string Id, OnlineTemplateFile File)>> folders = tree.Tree
            .Where(entry => entry.Type == "blob" && entry.Path.StartsWith(TemplatesFolder, StringComparison.Ordinal) && entry.Path.IndexOf('/', TemplatesFolder.Length) > 0)
            .Select(entry =>
            {
                string relative = entry.Path[TemplatesFolder.Length..];
                int separator = relative.IndexOf('/');
                return (Id: relative[..separator], File: new OnlineTemplateFile(relative[(separator + 1)..], entry.Size ?? 0, entry.Sha));
            })
            .GroupBy(item => item.Id, StringComparer.Ordinal);

        List<Task<OnlineTemplate?>> loads = [];
        foreach (IGrouping<string, (string Id, OnlineTemplateFile File)> folder in folders)
        {
            OnlineTemplateFile[] files = folder.Select(item => item.File).ToArray();
            if (!files.Any(file => file.Path == "manifest.json") || files.Length > MaximumFileCount || files.Sum(file => file.Size) > MaximumTemplateBytes) continue;
            loads.Add(LoadTemplateAsync(folder.Key, files, cancellationToken));
        }
        OnlineTemplate?[] loaded = await Task.WhenAll(loads);
        return loaded.OfType<OnlineTemplate>().OrderBy(template => template.Manifest.Name, StringComparer.CurrentCulture).ToArray();
    }

    /// <summary>Downloads and verifies every file, then installs or replaces the template in <paramref name="templatesRoot"/>.</summary>
    public async Task<InstalledTemplate> InstallAsync(OnlineTemplate template, string templatesRoot, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(template);
        ArgumentException.ThrowIfNullOrWhiteSpace(templatesRoot);
        string root = Path.GetFullPath(templatesRoot);
        Directory.CreateDirectory(root);
        // Stage beside the library so the final move never crosses volumes.
        string stagingRoot = Path.Combine(Path.GetDirectoryName(root.TrimEnd(Path.DirectorySeparatorChar))!, "downloads", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(stagingRoot);
        string? backup = null;
        string target = Path.Combine(root, template.Manifest.Id);
        try
        {
            using SemaphoreSlim gate = new(MaximumParallelDownloads);
            await Task.WhenAll(template.Files.Select(async file =>
            {
                await gate.WaitAsync(cancellationToken);
                try { await DownloadFileAsync(template.Manifest.Id, file, stagingRoot, cancellationToken); }
                finally { gate.Release(); }
            }));

            await using (FileStream stream = File.OpenRead(Path.Combine(stagingRoot, "manifest.json")))
            {
                TemplateManifest manifest = await JsonSerializer.DeserializeAsync<TemplateManifest>(stream, JsonOptions, cancellationToken) ?? throw new InvalidDataException("manifest.json is invalid.");
                if (!string.Equals(manifest.Id, template.Manifest.Id, StringComparison.Ordinal)) throw new InvalidDataException("The downloaded manifest does not match the selected template.");
                TemplateValidationResult validation = validator.Validate(manifest, stagingRoot);
                if (!validation.IsValid) throw new InvalidDataException(string.Join(" ", validation.Errors));
            }

            if (Directory.Exists(target))
            {
                backup = target + ".previous-" + Guid.NewGuid().ToString("N");
                Directory.Move(target, backup);
            }
            Directory.Move(stagingRoot, target);
            stagingRoot = string.Empty;
            if (backup is not null) { Directory.Delete(backup, true); backup = null; }
            return new InstalledTemplate(template.Manifest, target, Directory.EnumerateFiles(target, "*", SearchOption.AllDirectories).Sum(file => new FileInfo(file).Length));
        }
        finally
        {
            if (backup is not null && !Directory.Exists(target)) Directory.Move(backup, target);
            if (!string.IsNullOrEmpty(stagingRoot) && Directory.Exists(stagingRoot)) Directory.Delete(stagingRoot, true);
        }
    }

    private async Task<OnlineTemplate?> LoadTemplateAsync(string folderId, IReadOnlyList<OnlineTemplateFile> files, CancellationToken cancellationToken)
    {
        try
        {
            TemplateManifest? manifest = await http.GetFromJsonAsync<TemplateManifest>(FileUrl(folderId, "manifest.json"), JsonOptions, cancellationToken);
            if (manifest is null || !string.Equals(manifest.Id, folderId, StringComparison.Ordinal)) return null;
            if (!files.Any(file => file.Path == manifest.Entry) || !files.Any(file => file.Path == manifest.Preview)) return null;
            return new OnlineTemplate(manifest, FileUrl(folderId, manifest.Preview), files);
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException or NotSupportedException)
        {
            // A broken folder in the repository must not hide the others.
            return null;
        }
    }

    private async Task DownloadFileAsync(string templateId, OnlineTemplateFile file, string stagingRoot, CancellationToken cancellationToken)
    {
        string targetPath = TemplatePackageService.ResolveSafePath(stagingRoot, file.Path);
        byte[] content = await http.GetByteArrayAsync(FileUrl(templateId, file.Path), cancellationToken);
        if (content.LongLength != file.Size || !string.Equals(ComputeBlobSha(content), file.BlobSha, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException($"{file.Path} failed the integrity check. Try again later.");
        Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
        await File.WriteAllBytesAsync(targetPath, content, cancellationToken);
    }

    private string FileUrl(string templateId, string path) => RawRoot + TemplatesFolder + Uri.EscapeDataString(templateId) + "/" + string.Join('/', path.Split('/').Select(Uri.EscapeDataString));

    /// <summary>Git's blob hash: SHA-1 over "blob {length}\0" followed by the content.</summary>
    internal static string ComputeBlobSha(byte[] content)
    {
        byte[] header = Encoding.ASCII.GetBytes($"blob {content.LongLength}\0");
        using IncrementalHash sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA1);
        sha.AppendData(header);
        sha.AppendData(content);
        return Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant();
    }

    private sealed record GitTree(IReadOnlyList<GitTreeEntry> Tree, bool Truncated);
    private sealed record GitTreeEntry(string Path, string Type, string Sha, [property: JsonPropertyName("size")] long? Size);
}
