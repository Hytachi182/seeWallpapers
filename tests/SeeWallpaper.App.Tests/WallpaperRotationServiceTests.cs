using System.IO;
using SeeWallpaper.Infrastructure;
using SeeWallpaper.Platform;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class WallpaperRotationServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-rotation-tests", Guid.NewGuid().ToString("N"));
    private static readonly string[] Installed = ["rain", "sakura", "ocean", "forest"];
    private static readonly IReadOnlySet<string> NoFavorites = new HashSet<string>();
    private static readonly DateTimeOffset Now = new(2026, 10, 5, 14, 20, 0, TimeSpan.Zero);

    private static WallpaperRotationRule Rule(string target = "one", RotationOrder order = RotationOrder.Shuffle) =>
        WallpaperRotationRule.CreateDefault(target) with { Enabled = true, Order = order };

    [Fact]
    public void Shuffle_plays_every_wallpaper_once_before_repeating()
    {
        WallpaperRotationService service = new(new WallpaperRotationStore(_root), new Random(7));
        WallpaperRotationRule rule = Rule();
        string? current = null;
        List<string> played = [];
        for (int index = 0; index < Installed.Length; index++)
        {
            current = service.PickNext(rule, current, Installed, NoFavorites, [], out IReadOnlyList<string> bag);
            played.Add(current!);
            rule = rule with { CurrentTemplateId = current, ShuffleBag = bag };
        }
        Assert.Equal(Installed.OrderBy(id => id), played.OrderBy(id => id));
        string next = service.PickNext(rule, current, Installed, NoFavorites, [], out _)!;
        Assert.NotEqual(current, next);
    }

    [Fact]
    public void Sequential_follows_the_custom_order_and_wraps()
    {
        WallpaperRotationService service = new(new WallpaperRotationStore(_root));
        WallpaperRotationRule rule = Rule(order: RotationOrder.Sequential) with { Source = RotationSource.Custom, TemplateIds = ["ocean", "missing", "rain"] };
        Assert.Equal("ocean", service.PickNext(rule, null, Installed, NoFavorites, [], out _));
        Assert.Equal("rain", service.PickNext(rule, "ocean", Installed, NoFavorites, [], out _));
        Assert.Equal("ocean", service.PickNext(rule, "rain", Installed, NoFavorites, [], out _));
    }

    [Fact]
    public void Avoids_wallpapers_shown_on_other_displays_when_possible()
    {
        WallpaperRotationService service = new(new WallpaperRotationStore(_root));
        WallpaperRotationRule rule = Rule(order: RotationOrder.Sequential);
        Assert.Equal("ocean", service.PickNext(rule, "rain", Installed, NoFavorites, ["sakura"], out _));
        // When every option is taken, rotation still advances rather than stalling.
        Assert.Equal("sakura", service.PickNext(rule, "rain", Installed, NoFavorites, ["sakura", "ocean", "forest"], out _));
    }

    [Fact]
    public void Favorites_source_without_favorites_has_nothing_to_play()
    {
        WallpaperRotationService service = new(new WallpaperRotationStore(_root));
        Assert.Null(service.PickNext(Rule() with { Source = RotationSource.Favorites }, null, Installed, NoFavorites, [], out _));
        Assert.Equal("forest", service.PickNext(Rule() with { Source = RotationSource.Favorites }, null, Installed, new HashSet<string> { "FOREST" }, [], out _));
    }

    [Fact]
    public void Clock_alignment_lands_on_round_times()
    {
        DateTimeOffset local = new(2026, 10, 5, 14, 20, 0, TimeZoneInfo.Local.GetUtcOffset(new DateTime(2026, 10, 5, 14, 20, 0)));
        WallpaperRotationRule hourly = Rule() with { AlignToClock = true };
        Assert.Equal(new DateTime(2026, 10, 5, 15, 0, 0), WallpaperRotationService.NextChange(hourly, local).LocalDateTime);
        WallpaperRotationRule quarter = hourly with { Interval = 15, Unit = RotationIntervalUnit.Minutes };
        Assert.Equal(new DateTime(2026, 10, 5, 14, 30, 0), WallpaperRotationService.NextChange(quarter, local).LocalDateTime);
        Assert.Equal(local.AddHours(1), WallpaperRotationService.NextChange(hourly with { AlignToClock = false }, local));
    }

    [Fact]
    public async Task Synchronized_rotation_suspends_display_rules_and_survives_restart()
    {
        WallpaperRotationStore store = new(_root);
        WallpaperRotationService service = new(store);
        DisplayInfo[] displays = [new("one", "one", true, 1920, 1080, PersistentId: "one")];
        await service.SaveRuleAsync(Rule("one"), Now);
        Assert.Empty(service.DueRules(Now, displays));
        Assert.Single(service.DueRules(Now.AddHours(1), displays));

        await service.SaveRuleAsync(Rule(WallpaperRotationRule.AllDisplays), Now);
        Assert.Equal(WallpaperRotationRule.AllDisplays, Assert.Single(service.DueRules(Now.AddHours(2), displays)).Target);

        await service.MarkChangedAsync(WallpaperRotationRule.AllDisplays, "ocean", ["rain"], Now);
        WallpaperRotationService restarted = new(store);
        await restarted.LoadAsync(Now.AddMinutes(5));
        Assert.True(restarted.IsSynchronized);
        Assert.Equal("ocean", restarted.Find(WallpaperRotationRule.AllDisplays)!.CurrentTemplateId);
        Assert.Equal(Now.AddHours(1), restarted.Find(WallpaperRotationRule.AllDisplays)!.NextChangeAt);
    }

    [Fact]
    public async Task Pausing_stops_due_rules_and_resuming_restarts_countdowns()
    {
        WallpaperRotationService service = new(new WallpaperRotationStore(_root));
        DisplayInfo[] displays = [new("one", "one", true, 1920, 1080, PersistentId: "one")];
        await service.SaveRuleAsync(Rule("one"), Now);
        await service.SetOptionsAsync(paused: true, changeAtStartup: false, Now);
        Assert.Empty(service.DueRules(Now.AddHours(3), displays));
        await service.SetOptionsAsync(paused: false, changeAtStartup: false, Now.AddHours(3));
        Assert.Empty(service.DueRules(Now.AddHours(3), displays));
        Assert.Single(service.DueRules(Now.AddHours(4), displays));
    }

    [Fact]
    public async Task Change_at_startup_makes_enabled_rules_due_immediately()
    {
        WallpaperRotationStore store = new(_root);
        WallpaperRotationService service = new(store);
        await service.SaveRuleAsync(Rule("one"), Now);
        await service.SaveRuleAsync(Rule("two") with { Enabled = false }, Now);
        await service.SetOptionsAsync(paused: false, changeAtStartup: true, Now);
        WallpaperRotationService restarted = new(store);
        await restarted.LoadAsync(Now.AddMinutes(1));
        Assert.Equal(Now.AddMinutes(1), restarted.Find("one")!.NextChangeAt);
        Assert.NotEqual(Now.AddMinutes(1), restarted.Find("two")!.NextChangeAt);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }
}
