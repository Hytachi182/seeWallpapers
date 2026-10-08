using System.Text.Json;

namespace SeeWallpaper.Infrastructure;

public sealed class PerformanceSettingsStore
{
    private readonly string _path;

    public PerformanceSettingsStore(string dataRoot)
    {
        string directory = Path.Combine(dataRoot, "configuration");
        Directory.CreateDirectory(directory);
        _path = Path.Combine(directory, "performance.json");
    }

    public async Task<PerformanceSettings> LoadAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_path)) return PerformanceSettings.Default;
        try
        {
            await using FileStream stream = File.OpenRead(_path);
            return await JsonSerializer.DeserializeAsync<PerformanceSettings>(stream, cancellationToken: cancellationToken) ?? PerformanceSettings.Default;
        }
        catch (JsonException exception)
        {
            // Keep the damaged file for diagnosis without blocking gallery/restoration.
            string invalid = _path + ".invalid-" + Guid.NewGuid().ToString("N");
            try { File.Move(_path, invalid); }
            catch (Exception moveException) when (moveException is IOException or UnauthorizedAccessException)
            { global::System.Diagnostics.Trace.TraceError($"Could not preserve invalid performance settings: {moveException}"); }
            global::System.Diagnostics.Trace.TraceError($"Invalid performance settings; using defaults: {exception}");
            return PerformanceSettings.Default;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            global::System.Diagnostics.Trace.TraceError($"Could not load performance settings; using defaults: {exception}");
            return PerformanceSettings.Default;
        }
    }

    public async Task SaveAsync(PerformanceSettings settings, CancellationToken cancellationToken = default)
    {
        string temporaryPath = _path + ".tmp";
        await using (FileStream stream = File.Create(temporaryPath)) await JsonSerializer.SerializeAsync(stream, settings, cancellationToken: cancellationToken);
        File.Move(temporaryPath, _path, true);
    }

}

public sealed record PerformanceSettings(string Profile, bool PauseOnFullscreen, bool PauseOnBattery)
{
    public static PerformanceSettings Default { get; } = new("Balanced", true, false);
}
