using System.Text.Json;
using System.Text.Json.Serialization;

namespace SeeWallpaper.Infrastructure;

public enum RotationOrder { Sequential, Shuffle }
public enum RotationSource { AllInstalled, Favorites, Custom }
public enum RotationIntervalUnit { Minutes, Hours, Days }

/// <summary>
/// One rotation schedule. <see cref="Target"/> is a display assignment key, or <see cref="AllDisplays"/>
/// for a synchronized rotation that shows the same wallpaper everywhere.
/// </summary>
public sealed record WallpaperRotationRule(
    string Target,
    bool Enabled,
    int Interval,
    RotationIntervalUnit Unit,
    RotationOrder Order,
    RotationSource Source,
    IReadOnlyList<string> TemplateIds,
    bool AlignToClock = false,
    string? DisplayName = null,
    string? CurrentTemplateId = null,
    DateTimeOffset? NextChangeAt = null,
    IReadOnlyList<string>? ShuffleBag = null)
{
    public const string AllDisplays = "*";
    public static readonly TimeSpan MinimumPeriod = TimeSpan.FromMinutes(1);

    public static WallpaperRotationRule CreateDefault(string target, string? displayName = null) =>
        new(target, false, 1, RotationIntervalUnit.Hours, RotationOrder.Shuffle, RotationSource.AllInstalled, [], DisplayName: displayName);

    [JsonIgnore]
    public TimeSpan Period
    {
        get
        {
            int interval = Math.Clamp(Interval, 1, 9999);
            TimeSpan period = Unit switch
            {
                RotationIntervalUnit.Days => TimeSpan.FromDays(interval),
                RotationIntervalUnit.Hours => TimeSpan.FromHours(interval),
                _ => TimeSpan.FromMinutes(interval)
            };
            return period < MinimumPeriod ? MinimumPeriod : period;
        }
    }
}

public sealed record WallpaperRotationDocument(int Version, bool Paused, bool ChangeAtStartup, IReadOnlyList<WallpaperRotationRule> Rules)
{
    public static WallpaperRotationDocument Empty { get; } = new(1, false, false, []);
}

/// <summary>Versioned, atomically-written rotation schedules. Corrupt files are quarantined.</summary>
public sealed class WallpaperRotationStore
{
    private readonly string _path;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true, Converters = { new JsonStringEnumConverter() } };

    public WallpaperRotationStore(string dataRoot)
    {
        string directory = Path.Combine(dataRoot, "configuration");
        Directory.CreateDirectory(directory);
        _path = Path.Combine(directory, "wallpaper-rotation.json");
    }

    public async Task<WallpaperRotationDocument> LoadAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_path)) return WallpaperRotationDocument.Empty;
        try
        {
            await using FileStream stream = File.OpenRead(_path);
            WallpaperRotationDocument? value = await JsonSerializer.DeserializeAsync<WallpaperRotationDocument>(stream, Options, cancellationToken);
            return value is { Version: 1, Rules: not null } ? value with { Rules = value.Rules.Where(rule => rule is { Target: not null, TemplateIds: not null }).ToArray() } : WallpaperRotationDocument.Empty;
        }
        catch (JsonException)
        {
            string invalid = _path + ".invalid-" + DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmss");
            try { File.Move(_path, invalid, true); }
            catch (IOException) { /* An unreadable schedule must never block the wallpapers. */ }
            return WallpaperRotationDocument.Empty;
        }
        catch (IOException) { return WallpaperRotationDocument.Empty; }
    }

    public async Task SaveAsync(WallpaperRotationDocument document, CancellationToken cancellationToken = default)
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
