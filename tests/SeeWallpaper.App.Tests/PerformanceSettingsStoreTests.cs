using System.IO;
using SeeWallpaper.Infrastructure;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class PerformanceSettingsStoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-performance-settings-tests", Guid.NewGuid().ToString("N"));

    [Theory]
    [InlineData("{broken")]
    [InlineData("{\"PauseOnFullscreen\":\"invalid\"}")]
    public async Task Damaged_settings_use_defaults_and_preserve_the_original_for_diagnosis(string json)
    {
        PerformanceSettingsStore store = new(_root);
        string path = Path.Combine(_root, "configuration", "performance.json");
        await File.WriteAllTextAsync(path, json);
        Assert.Equal(PerformanceSettings.Default, await store.LoadAsync());
        Assert.False(File.Exists(path));
        string preserved = Assert.Single(Directory.GetFiles(Path.GetDirectoryName(path)!, "performance.json.invalid-*"));
        Assert.Equal(json, await File.ReadAllTextAsync(preserved));
        PerformanceSettings replacement = new("Eco", false, true);
        await store.SaveAsync(replacement);
        Assert.Equal(replacement, await store.LoadAsync());
    }

    [Fact]
    public async Task Temporarily_unreadable_settings_do_not_block_startup_or_destroy_the_file()
    {
        PerformanceSettingsStore store = new(_root);
        PerformanceSettings saved = new("High", false, true);
        await store.SaveAsync(saved);
        string path = Path.Combine(_root, "configuration", "performance.json");
        using (FileStream locked = new(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
            Assert.Equal(PerformanceSettings.Default, await store.LoadAsync());
        Assert.Equal(saved, await store.LoadAsync());
    }

    [Fact]
    public async Task Cancellation_is_not_replaced_with_default_settings()
    {
        PerformanceSettingsStore store = new(_root);
        await store.SaveAsync(PerformanceSettings.Default);
        using CancellationTokenSource cancellation = new();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => store.LoadAsync(cancellation.Token));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
