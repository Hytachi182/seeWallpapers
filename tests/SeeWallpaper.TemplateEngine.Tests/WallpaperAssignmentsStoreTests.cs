using SeeWallpaper.Infrastructure;
using Xunit;

namespace SeeWallpaper.TemplateEngine.Tests;

public sealed class WallpaperAssignmentsStoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Saves_and_loads_independent_assignments_without_display_order()
    {
        WallpaperAssignmentsStore store = new(_root);
        WallpaperAssignmentsDocument expected = new(1, WallpaperAssignmentMode.Independent, null,
        [new PersistedWallpaperAssignment("MONITOR-A", "rain"), new PersistedWallpaperAssignment("MONITOR-B", "sakura")]);

        await store.SaveAsync(expected);
        WallpaperAssignmentsDocument actual = await store.LoadAsync();

        Assert.Equal(WallpaperAssignmentMode.Independent, actual.Mode);
        Assert.Equal(new[] { "MONITOR-A", "MONITOR-B" }, actual.Assignments.Select(item => item.DisplayKey));
        Assert.Equal(new[] { "rain", "sakura" }, actual.Assignments.Select(item => item.TemplateId));
    }

    [Fact]
    public async Task Quarantines_invalid_json_and_returns_empty_state()
    {
        WallpaperAssignmentsStore store = new(_root);
        string configuration = Path.Combine(_root, "configuration");
        Directory.CreateDirectory(configuration);
        await File.WriteAllTextAsync(Path.Combine(configuration, "wallpaper-assignments.json"), "not json");

        WallpaperAssignmentsDocument state = await store.LoadAsync();

        Assert.Equal(WallpaperAssignmentsDocument.Empty, state);
        Assert.Single(Directory.GetFiles(configuration, "wallpaper-assignments.json.invalid-*"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }
}
