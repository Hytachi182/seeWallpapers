using System.Text.Json;

namespace SeeWallpaper.Infrastructure;

public sealed class TemplateSettingsStore
{
    private readonly string _settingsDirectory;

    public TemplateSettingsStore(string dataRoot)
    {
        _settingsDirectory = Path.Combine(dataRoot, "settings");
        Directory.CreateDirectory(_settingsDirectory);
    }

    public async Task<IReadOnlyDictionary<string, object?>> LoadAsync(string templateId, IReadOnlyDictionary<string, object?> defaults, CancellationToken cancellationToken = default)
    {
        string path = GetPath(templateId);
        if (!File.Exists(path)) return new Dictionary<string, object?>(defaults);
        await using FileStream stream = File.OpenRead(path);
        Dictionary<string, JsonElement>? saved = await JsonSerializer.DeserializeAsync<Dictionary<string, JsonElement>>(stream, cancellationToken: cancellationToken);
        Dictionary<string, object?> merged = new(defaults);
        if (saved is not null) foreach ((string key, JsonElement value) in saved) merged[key] = value;
        return merged;
    }

    public async Task SaveAsync(string templateId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        string path = GetPath(templateId);
        string temporaryPath = path + ".tmp";
        await using (FileStream stream = File.Create(temporaryPath)) await JsonSerializer.SerializeAsync(stream, settings, cancellationToken: cancellationToken);
        File.Move(temporaryPath, path, true);
    }

    private string GetPath(string templateId)
    {
        if (string.IsNullOrWhiteSpace(templateId) || templateId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) throw new ArgumentException("Invalid template id.", nameof(templateId));
        return Path.Combine(_settingsDirectory, $"{templateId}.json");
    }
}
