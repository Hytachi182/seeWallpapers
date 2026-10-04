using System.Text.Json;

namespace SeeWallpaper.Infrastructure;

public enum WallpaperAssignmentMode { Independent, Clone, Span }

public sealed record PersistedWallpaperAssignment(string DisplayKey, string TemplateId, string? DisplayName = null);

public sealed record WallpaperAssignmentsDocument(
    int Version,
    WallpaperAssignmentMode Mode,
    string? GlobalTemplateId,
    IReadOnlyList<PersistedWallpaperAssignment> Assignments)
{
    public static WallpaperAssignmentsDocument Empty { get; } = new(1, WallpaperAssignmentMode.Independent, null, []);
}

/// <summary>Versioned, atomically-written assignment state. Corrupt files are quarantined.</summary>
public sealed class WallpaperAssignmentsStore
{
    private readonly string _path;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };

    public WallpaperAssignmentsStore(string dataRoot)
    {
        string directory = Path.Combine(dataRoot, "configuration");
        Directory.CreateDirectory(directory);
        _path = Path.Combine(directory, "wallpaper-assignments.json");
    }

    public async Task<WallpaperAssignmentsDocument> LoadAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_path)) return WallpaperAssignmentsDocument.Empty;
        try
        {
            await using FileStream stream = File.OpenRead(_path);
            WallpaperAssignmentsDocument? value = await JsonSerializer.DeserializeAsync<WallpaperAssignmentsDocument>(stream, Options, cancellationToken);
            return value is { Version: 1, Assignments: not null } ? value : WallpaperAssignmentsDocument.Empty;
        }
        catch (JsonException)
        {
            string invalid = _path + ".invalid-" + DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmss");
            try { File.Move(_path, invalid, true); }
            catch (IOException) { /* Falling back to an empty state must not block the gallery. */ }
            return WallpaperAssignmentsDocument.Empty;
        }
        catch (IOException) { return WallpaperAssignmentsDocument.Empty; }
    }

    public async Task SaveAsync(WallpaperAssignmentsDocument document, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        await _writeLock.WaitAsync(cancellationToken);
        try
        {
            string temporary = _path + ".tmp";
            await using (FileStream stream = File.Create(temporary)) await JsonSerializer.SerializeAsync(stream, document with { Version = 1 }, Options, cancellationToken);
            File.Move(temporary, _path, true);
        }
        finally { _writeLock.Release(); }
    }
}
