using System.Text.Json;

namespace SeeWallpaper.Infrastructure;

public sealed class FavoritesStore
{
    private readonly string _path;
    public FavoritesStore(string dataRoot)
    {
        string directory = Path.Combine(dataRoot, "configuration");
        Directory.CreateDirectory(directory);
        _path = Path.Combine(directory, "favorites.json");
    }

    public async Task<IReadOnlySet<string>> LoadAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_path)) return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using FileStream stream = File.OpenRead(_path);
        string[] saved = await JsonSerializer.DeserializeAsync<string[]>(stream, cancellationToken: cancellationToken) ?? [];
        return new HashSet<string>(saved, StringComparer.OrdinalIgnoreCase);
    }

    public async Task SaveAsync(IEnumerable<string> templateIds, CancellationToken cancellationToken = default)
    {
        string temporaryPath = _path + ".tmp";
        await using (FileStream stream = File.Create(temporaryPath)) await JsonSerializer.SerializeAsync(stream, templateIds.OrderBy(id => id, StringComparer.OrdinalIgnoreCase).ToArray(), cancellationToken: cancellationToken);
        File.Move(temporaryPath, _path, true);
    }
}
