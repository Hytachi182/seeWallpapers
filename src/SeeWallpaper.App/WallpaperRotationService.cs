using SeeWallpaper.Infrastructure;
using SeeWallpaper.Platform;

namespace SeeWallpaper.App;

/// <summary>Decides when each rotation is due and which wallpaper comes next. Applying is left to the caller.</summary>
internal sealed class WallpaperRotationService(WallpaperRotationStore store, Random? random = null)
{
    private static readonly StringComparer Ids = StringComparer.OrdinalIgnoreCase;
    private readonly Random _random = random ?? Random.Shared;

    public WallpaperRotationDocument Document { get; private set; } = WallpaperRotationDocument.Empty;

    /// <summary>A synchronized rotation takes over every display and suspends per-display rules.</summary>
    public bool IsSynchronized => Find(WallpaperRotationRule.AllDisplays) is { Enabled: true };
    public bool HasActiveRules => Document.Rules.Any(rule => rule.Enabled);

    public async Task LoadAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        Document = await store.LoadAsync(cancellationToken);
        // Missed intervals while the app was closed collapse into a single change, never a replay.
        Document = Document with
        {
            Rules = Document.Rules.Select(rule =>
                rule.Enabled && Document.ChangeAtStartup ? rule with { NextChangeAt = now }
                : rule.NextChangeAt is null ? rule with { NextChangeAt = NextChange(rule, now) }
                : rule).ToArray()
        };
    }

    public WallpaperRotationRule? Find(string target) => Document.Rules.FirstOrDefault(rule => Ids.Equals(rule.Target, target));
    public WallpaperRotationRule GetOrDefault(string target, string? displayName = null) => Find(target) ?? WallpaperRotationRule.CreateDefault(target, displayName);

    public IReadOnlyList<WallpaperRotationRule> DueRules(DateTimeOffset now, IReadOnlyList<DisplayInfo> connected)
    {
        if (Document.Paused) return [];
        return ActiveRules(connected).Where(rule => rule.NextChangeAt is null || rule.NextChangeAt <= now).ToArray();
    }

    /// <summary>Rules that currently drive a wallpaper: the synchronized one, or each connected display's own.</summary>
    public IReadOnlyList<WallpaperRotationRule> ActiveRules(IReadOnlyList<DisplayInfo> connected) => IsSynchronized
        ? [Find(WallpaperRotationRule.AllDisplays)!]
        : Document.Rules.Where(rule => rule.Enabled && rule.Target != WallpaperRotationRule.AllDisplays
            && connected.Any(display => Ids.Equals(display.AssignmentKey, rule.Target))).ToArray();

    public static string[] Candidates(WallpaperRotationRule rule, IReadOnlyList<string> installed, IReadOnlySet<string> favorites) => rule.Source switch
    {
        RotationSource.Favorites => installed.Where(id => favorites.Contains(id, Ids)).ToArray(),
        // Custom keeps the user's order, which is what sequential rotation follows.
        RotationSource.Custom => rule.TemplateIds.Where(id => installed.Contains(id, Ids)).Distinct(Ids).ToArray(),
        _ => installed.ToArray()
    };

    /// <summary>
    /// Picks the wallpaper after <paramref name="current"/>. Shuffle uses a bag so every wallpaper plays once
    /// before any repeats; <paramref name="avoid"/> (wallpapers on other displays) is honoured when possible.
    /// </summary>
    public string? PickNext(WallpaperRotationRule rule, string? current, IReadOnlyList<string> installed, IReadOnlySet<string> favorites,
        IReadOnlyCollection<string> avoid, out IReadOnlyList<string> shuffleBag)
    {
        string[] candidates = Candidates(rule, installed, favorites);
        shuffleBag = [];
        if (candidates.Length == 0) return null;
        bool Usable(string id) => !Ids.Equals(id, current) && !avoid.Contains(id, Ids);

        if (rule.Order == RotationOrder.Sequential)
        {
            int index = Array.FindIndex(candidates, id => Ids.Equals(id, current ?? rule.CurrentTemplateId));
            IEnumerable<string> following = Enumerable.Range(1, candidates.Length).Select(step => candidates[(index + step) % candidates.Length]);
            return following.FirstOrDefault(Usable) ?? candidates[(index + 1) % candidates.Length];
        }

        List<string> bag = (rule.ShuffleBag ?? []).Where(id => candidates.Contains(id, Ids)).Distinct(Ids).ToList();
        if (bag.Count == 0 || !bag.Any(id => !Ids.Equals(id, current)))
        {
            bag = candidates.OrderBy(_ => _random.Next()).ToList();
            // A fresh bag must not start with the wallpaper that just ended the previous one.
            if (bag.Count > 1 && Ids.Equals(bag[0], current)) { bag.RemoveAt(0); bag.Add(current!); }
        }
        string pick = bag.FirstOrDefault(Usable) ?? bag.FirstOrDefault(id => !Ids.Equals(id, current)) ?? bag[0];
        bag.Remove(pick);
        shuffleBag = bag;
        return pick;
    }

    /// <summary>Next change time; clock-aligned periods land on round times counted from local midnight.</summary>
    public static DateTimeOffset NextChange(WallpaperRotationRule rule, DateTimeOffset now)
    {
        TimeSpan period = rule.Period;
        if (!rule.AlignToClock || period > TimeSpan.FromDays(1)) return now + period;
        DateTimeOffset local = now.ToLocalTime();
        DateTimeOffset midnight = new(local.Date, local.Offset);
        long slots = (long)Math.Floor((local - midnight).Ticks / (double)period.Ticks) + 1;
        DateTimeOffset next = midnight + TimeSpan.FromTicks(period.Ticks * slots);
        DateTimeOffset tomorrow = midnight.AddDays(1);
        return next > tomorrow ? tomorrow : next;
    }

    public Task MarkChangedAsync(string target, string templateId, IReadOnlyList<string> shuffleBag, DateTimeOffset now, CancellationToken cancellationToken = default) =>
        UpdateAsync(target, rule => rule with { CurrentTemplateId = templateId, ShuffleBag = shuffleBag, NextChangeAt = NextChange(rule, now) }, cancellationToken);

    /// <summary>Retries at the next interval instead of every tick after a failure.</summary>
    public Task PostponeAsync(string target, DateTimeOffset now, CancellationToken cancellationToken = default) =>
        UpdateAsync(target, rule => rule with { NextChangeAt = NextChange(rule, now) }, cancellationToken);

    /// <summary>Stores edited settings while keeping playback state; a changed schedule restarts its countdown.</summary>
    public async Task SaveRuleAsync(WallpaperRotationRule edited, DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        WallpaperRotationRule? previous = Find(edited.Target);
        bool scheduleChanged = previous is null || !previous.Enabled || previous.Period != edited.Period || previous.AlignToClock != edited.AlignToClock;
        bool poolChanged = previous is null || previous.Source != edited.Source || previous.Order != edited.Order || !previous.TemplateIds.SequenceEqual(edited.TemplateIds, Ids);
        WallpaperRotationRule merged = edited with
        {
            CurrentTemplateId = previous?.CurrentTemplateId,
            ShuffleBag = poolChanged ? null : previous?.ShuffleBag,
            NextChangeAt = scheduleChanged ? NextChange(edited, now) : previous?.NextChangeAt
        };
        Document = Document with { Rules = Document.Rules.Where(rule => !Ids.Equals(rule.Target, edited.Target)).Append(merged).ToArray() };
        await store.SaveAsync(Document, cancellationToken);
    }

    public async Task SetOptionsAsync(bool paused, bool changeAtStartup, DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        // Resuming starts fresh countdowns rather than firing everything that expired during the pause.
        IReadOnlyList<WallpaperRotationRule> rules = Document.Paused && !paused
            ? Document.Rules.Select(rule => rule with { NextChangeAt = NextChange(rule, now) }).ToArray()
            : Document.Rules;
        Document = Document with { Paused = paused, ChangeAtStartup = changeAtStartup, Rules = rules };
        await store.SaveAsync(Document, cancellationToken);
    }

    private async Task UpdateAsync(string target, Func<WallpaperRotationRule, WallpaperRotationRule> change, CancellationToken cancellationToken)
    {
        if (Find(target) is null) return;
        Document = Document with { Rules = Document.Rules.Select(rule => Ids.Equals(rule.Target, target) ? change(rule) : rule).ToArray() };
        await store.SaveAsync(Document, cancellationToken);
    }
}
