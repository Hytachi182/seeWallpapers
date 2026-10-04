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
        await using FileStream stream = File.OpenRead(_path);
        return await JsonSerializer.DeserializeAsync<PerformanceSettings>(stream, cancellationToken: cancellationToken) ?? PerformanceSettings.Default;
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
