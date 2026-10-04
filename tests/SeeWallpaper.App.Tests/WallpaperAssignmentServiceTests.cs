using System.IO;
using SeeWallpaper.App;
using SeeWallpaper.Core;
using SeeWallpaper.Engine;
using SeeWallpaper.Infrastructure;
using SeeWallpaper.Platform;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class WallpaperAssignmentServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-app-tests", Guid.NewGuid().ToString("N"));
    private static readonly DisplayInfo[] Displays = [new("one", "one", true, 1920, 1080), new("two", "two", false, 1920, 1080), new("three", "three", false, 1920, 1080)];
    private static readonly IReadOnlyDictionary<string, object?> Settings = new Dictionary<string, object?>();
    private static InstalledTemplate Scene(string id) => new(new TemplateManifest(1, id, id, "scene", "tests", "1.0.0", "test", "web", "index.html", "preview.jpg", "low", []), "unused", 0);

    [Fact]
    public async Task Replacing_one_cloned_display_preserves_other_assignments_across_restart()
    {
        FakeHost host = new();
        WallpaperAssignmentsStore store = new(_root);
        WallpaperAssignmentService service = Create(host, store);
        await service.ApplyGlobalAsync(Scene("rain"), Settings, WallpaperAssignmentMode.Clone);
        host.Operations.Clear();

        await service.ApplyAsync(Scene("sakura"), Displays[1], Settings);

        Assert.Equal(new[] { "apply:two:sakura" }, host.Operations);
        Assert.Equal(WallpaperAssignmentMode.Independent, service.State.Mode);
        FakeHost restartedHost = new();
        WallpaperAssignmentService restarted = Create(restartedHost, store);
        await restarted.RestoreAsync(new Dictionary<string, InstalledTemplate> { ["rain"] = Scene("rain"), ["sakura"] = Scene("sakura") }, _ => Task.FromResult(Settings));
        Assert.Equal(new[] { "apply:one:rain", "apply:three:rain", "apply:two:sakura" }, restartedHost.Operations);
    }

    [Fact]
    public async Task Removing_one_cloned_display_keeps_other_displays_and_saved_choices()
    {
        FakeHost host = new();
        WallpaperAssignmentService service = Create(host, new(_root));
        await service.ApplyGlobalAsync(Scene("rain"), Settings, WallpaperAssignmentMode.Clone);
        host.Operations.Clear();
        await service.RemoveAsync(Displays[1]);
        Assert.Equal(new[] { "stop:two" }, host.Operations);
        Assert.Equal(new[] { "one", "three" }, service.State.Assignments.Select(item => item.DisplayKey));
        Assert.All(service.State.Assignments, item => Assert.Equal("rain", item.TemplateId));
    }

    [Fact]
    public async Task A_failed_local_replacement_preserves_saved_assignments()
    {
        FakeHost host = new();
        WallpaperAssignmentsStore store = new(_root);
        WallpaperAssignmentService service = Create(host, store);
        await service.ApplyAsync(Scene("rain"), Displays[0], Settings);
        host.FailApply = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ApplyAsync(Scene("sakura"), Displays[0], Settings));
        Assert.Equal("rain", Assert.Single(service.State.Assignments).TemplateId);
        Assert.Equal("rain", Assert.Single((await store.LoadAsync()).Assignments).TemplateId);
    }

    [Fact]
    public async Task A_spanning_scene_cannot_be_removed_as_if_it_were_independent()
    {
        FakeHost host = new();
        WallpaperAssignmentService service = Create(host, new(_root));
        await service.ApplyGlobalAsync(Scene("rain"), Settings, WallpaperAssignmentMode.Span);
        host.Operations.Clear();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RemoveAsync(Displays[1]));
        Assert.Empty(host.Operations);
        Assert.Equal(WallpaperAssignmentMode.Span, service.State.Mode);
    }

    private static WallpaperAssignmentService Create(FakeHost host, WallpaperAssignmentsStore store) => new(host, new FakeDisplays(), store, id => Scene(id), _ => Task.FromResult(Settings));
    private sealed class FakeDisplays : IDisplayManager { public IReadOnlyList<DisplayInfo> GetDisplays() => Displays; }
    private sealed class FakeHost : IWallpaperHost
    {
        public List<string> Operations { get; } = [];
        public bool FailApply { get; set; }
        public IReadOnlyCollection<string> ActiveDisplayIds => [];
        public Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
        {
            if (FailApply) throw new InvalidOperationException("Simulated loading failure");
            Operations.Add($"apply:{displayId}:{template.Manifest.Id}"); return Task.CompletedTask;
        }
        public Task ApplyCloneAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default) { Operations.Add("clone"); return Task.CompletedTask; }
        public Task ApplySpanAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default) { Operations.Add("span"); return Task.CompletedTask; }
        public Task StopDisplayAsync(string displayId, CancellationToken cancellationToken = default) { Operations.Add($"stop:{displayId}"); return Task.CompletedTask; }
        public Task StopAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SetPausedAsync(bool isPaused, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    public void Dispose() { if (Directory.Exists(_root)) Directory.Delete(_root, true); }
}
