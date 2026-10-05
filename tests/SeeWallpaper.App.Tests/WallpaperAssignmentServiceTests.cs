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
    private static readonly DisplayInfo[] Displays = [new("one", "one", true, 1920, 1080, PersistentId: "one"), new("two", "two", false, 1920, 1080, PersistentId: "two"), new("three", "three", false, 1920, 1080, PersistentId: "three")];
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

    [Fact]
    public async Task Disconnect_and_reconnect_restores_only_the_same_monitor_even_when_runtime_id_changes()
    {
        FakeHost host = new(); FakeDisplays displays = new(); WallpaperAssignmentsStore store = new(_root);
        WallpaperAssignmentService service = new(host, displays, store, Scene, _ => Task.FromResult(Settings));
        await service.ApplyAsync(Scene("rain"), Displays[0], Settings);
        await service.ApplyAsync(Scene("sakura"), Displays[1], Settings);
        host.Operations.Clear();
        displays.Connected = [Displays[0], Displays[2]];
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Equal(new[] { "stop:two" }, host.Operations);
        Assert.Equal(2, (await store.LoadAsync()).Assignments.Count);
        host.Operations.Clear();
        displays.Connected = [Displays[0], Displays[1] with { Id = "new-two" }, Displays[2]];
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Equal(new[] { "apply:new-two:sakura" }, host.Operations);
        host.Operations.Clear();
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Empty(host.Operations);
    }

    [Fact]
    public async Task An_unknown_monitor_reusing_a_runtime_id_does_not_receive_the_previous_scene()
    {
        FakeHost host = new(); FakeDisplays displays = new();
        WallpaperAssignmentService service = new(host, displays, new(_root), Scene, _ => Task.FromResult(Settings));
        await service.ApplyAsync(Scene("rain"), Displays[0], Settings);
        host.Operations.Clear();
        displays.Connected = [Displays[0] with { PersistentId = "another-monitor" }];
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Equal(new[] { "stop:one" }, host.Operations);
    }

    [Fact]
    public async Task Geometry_changes_replace_only_the_changed_display_and_failed_replacements_can_retry()
    {
        FakeHost host = new(); FakeDisplays displays = new();
        WallpaperAssignmentService service = new(host, displays, new(_root), Scene, _ => Task.FromResult(Settings));
        await service.ApplyAsync(Scene("rain"), Displays[0], Settings);
        await service.ApplyAsync(Scene("sakura"), Displays[1], Settings);
        displays.Connected = [Displays[0], Displays[1] with { Width = 2560, X = -2560 }, Displays[2]];
        host.Operations.Clear(); host.FailApply = true;
        Assert.Single(await service.ReconcileDisplaysAsync());
        host.FailApply = false;
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Equal(new[] { "apply:two:sakura" }, host.Operations);
    }

    [Theory]
    [InlineData(WallpaperAssignmentMode.Clone, "clone")]
    [InlineData(WallpaperAssignmentMode.Span, "span")]
    public async Task Global_modes_recompute_once_when_the_topology_changes(WallpaperAssignmentMode mode, string operation)
    {
        FakeHost host = new(); FakeDisplays displays = new();
        WallpaperAssignmentService service = new(host, displays, new(_root), Scene, _ => Task.FromResult(Settings));
        await service.ApplyGlobalAsync(Scene("rain"), Settings, mode);
        host.Operations.Clear();
        displays.Connected = [Displays[0], Displays[1] with { Height = 1440 }, Displays[2]];
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Equal(new[] { operation }, host.Operations);
        host.Operations.Clear();
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Empty(host.Operations);
    }

    private static WallpaperAssignmentService Create(FakeHost host, WallpaperAssignmentsStore store) => new(host, new FakeDisplays(), store, id => Scene(id), _ => Task.FromResult(Settings));

    [Fact]
    public async Task Explicit_selection_replaces_the_legacy_record_without_repeated_upgrade_warnings()
    {
        FakeHost host = new(); FakeDisplays displays = new() { Connected = [Displays[0] with { PersistentId = "monitor-one" }] };
        WallpaperAssignmentsStore store = new(_root);
        await store.SaveAsync(new(1, WallpaperAssignmentMode.Independent, null, [new("one", "rain")]));
        WallpaperAssignmentService service = new(host, displays, store, Scene, _ => Task.FromResult(Settings));
        var catalog = new Dictionary<string, InstalledTemplate> { ["rain"] = Scene("rain") };
        await service.RestoreAsync(catalog, _ => Task.FromResult(Settings));
        Assert.Single(service.RestoreWarnings);
        Assert.Empty(host.Operations);
        await service.ApplyAsync(Scene("rain"), displays.Connected[0], Settings);
        Assert.Equal("monitor-one", Assert.Single((await store.LoadAsync()).Assignments).DisplayKey);
        await service.RestoreAsync(catalog, _ => Task.FromResult(Settings));
        Assert.Empty(service.RestoreWarnings);
    }

    [Fact]
    public async Task A_monitor_without_persistent_identity_is_not_restored_from_a_session_number()
    {
        FakeHost host = new(); FakeDisplays displays = new() { Connected = [Displays[0] with { PersistentId = null }] };
        WallpaperAssignmentsStore store = new(_root);
        await store.SaveAsync(new(1, WallpaperAssignmentMode.Independent, null, [new("one", "rain")]));
        WallpaperAssignmentService service = new(host, displays, store, Scene, _ => Task.FromResult(Settings));
        await service.RestoreAsync(new Dictionary<string, InstalledTemplate> { ["rain"] = Scene("rain") }, _ => Task.FromResult(Settings));
        Assert.Single(service.RestoreWarnings);
        Assert.Empty(host.Operations);
        Assert.Single(await service.ReconcileDisplaysAsync());
        Assert.Empty(host.Operations);
    }

    [Fact]
    public async Task Restore_isolates_one_failed_wallpaper_and_reports_the_error()
    {
        FakeHost host = new(); WallpaperAssignmentsStore store = new(_root);
        await store.SaveAsync(new(1, WallpaperAssignmentMode.Independent, null,
            [new("one", "broken"), new("two", "rain")]));
        host.FailedTemplateId = "broken";
        WallpaperAssignmentService service = Create(host, store);
        await service.RestoreAsync(new Dictionary<string, InstalledTemplate> { ["broken"] = Scene("broken"), ["rain"] = Scene("rain") }, _ => Task.FromResult(Settings));
        Assert.Single(service.RestoreWarnings);
        Assert.Equal(new[] { "apply:two:rain" }, host.Operations);
    }

    [Fact]
    public async Task Ambiguous_monitor_identities_are_not_assigned_automatically()
    {
        FakeHost host = new(); FakeDisplays displays = new(); WallpaperAssignmentsStore store = new(_root);
        WallpaperAssignmentService service = new(host, displays, store, Scene, _ => Task.FromResult(Settings));
        await service.ApplyAsync(Scene("rain"), Displays[0], Settings);
        host.Operations.Clear();
        displays.Connected = [Displays[0] with { Width = 2560 }, Displays[1] with { PersistentId = "one" }];
        Assert.Empty(await service.ReconcileDisplaysAsync());
        Assert.Empty(host.Operations);
    }
    private sealed class FakeDisplays : IDisplayManager
    {
        public IReadOnlyList<DisplayInfo> Connected { get; set; } = Displays;
        public IReadOnlyList<DisplayInfo> GetDisplays() => Connected;
    }
    private sealed class FakeHost : IWallpaperHost
    {
        public List<string> Operations { get; } = [];
        public bool FailApply { get; set; }
        public string? FailedTemplateId { get; set; }
        private readonly HashSet<string> _active = [];
        public IReadOnlyCollection<string> ActiveDisplayIds => _active;
        public Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
        {
            if (FailApply || template.Manifest.Id == FailedTemplateId) throw new InvalidOperationException("Simulated loading failure");
            _active.Add(displayId);
            Operations.Add($"apply:{displayId}:{template.Manifest.Id}"); return Task.CompletedTask;
        }
        public Task ApplyCloneAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default) { Operations.Add("clone"); return Task.CompletedTask; }
        public Task ApplySpanAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default) { Operations.Add("span"); return Task.CompletedTask; }
        public Task StopDisplayAsync(string displayId, CancellationToken cancellationToken = default) { _active.Remove(displayId); Operations.Add($"stop:{displayId}"); return Task.CompletedTask; }
        public Task StopAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SetPausedAsync(bool isPaused, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    public void Dispose() { if (Directory.Exists(_root)) Directory.Delete(_root, true); }
}
