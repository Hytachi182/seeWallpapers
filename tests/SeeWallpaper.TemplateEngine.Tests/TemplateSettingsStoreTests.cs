using System.Text.Json;
using SeeWallpaper.Infrastructure;
using Xunit;

namespace SeeWallpaper.TemplateEngine.Tests;

public sealed class TemplateSettingsStoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Saved_values_override_defaults_after_reload()
    {
        TemplateSettingsStore store = new(_root);
        await store.SaveAsync("digital-rain-3d", new Dictionary<string, object?> { ["speed"] = 2.3, ["glow"] = false });

        IReadOnlyDictionary<string, object?> loaded = await store.LoadAsync("digital-rain-3d", new Dictionary<string, object?> { ["speed"] = 1.0, ["color"] = "#00ff66" });

        Assert.Equal(2.3, ((JsonElement)loaded["speed"]!).GetDouble());
        Assert.False(((JsonElement)loaded["glow"]!).GetBoolean());
        Assert.Equal("#00ff66", loaded["color"]);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }
}
