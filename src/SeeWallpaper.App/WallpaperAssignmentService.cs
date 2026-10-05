using SeeWallpaper.Core;
using SeeWallpaper.Engine;
using SeeWallpaper.Infrastructure;
using SeeWallpaper.Platform;
using System.IO;

namespace SeeWallpaper.App;

/// <summary>Coordinates engine success with durable state and display identity matching.</summary>
internal sealed class WallpaperAssignmentService
{
    private readonly IWallpaperHost _host;
    private readonly IDisplayManager _displays;
    private readonly WallpaperAssignmentsStore _store;
    private readonly Func<string, InstalledTemplate?> _templateResolver;
    private readonly Func<InstalledTemplate, Task<IReadOnlyDictionary<string, object?>>> _settingsLoader;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private WallpaperAssignmentsDocument _state = WallpaperAssignmentsDocument.Empty;
    private readonly Dictionary<string, DisplayInfo> _activeDisplays = new(StringComparer.OrdinalIgnoreCase);

    public async Task<IReadOnlyList<string>> ReconcileDisplaysAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            DisplayInfo[] connected = _displays.GetDisplays().ToArray();
            List<string> errors = [];
            foreach (DisplayInfo previous in _activeDisplays.Values.ToArray())
            {
                if (!connected.Any(display => display.Id == previous.Id && display.AssignmentKey == previous.AssignmentKey))
                {
                    await _host.StopDisplayAsync(previous.Id, cancellationToken);
                    _activeDisplays.Remove(previous.Id);
                }
            }
            if (_state.Mode is WallpaperAssignmentMode.Clone or WallpaperAssignmentMode.Span)
            {
                if (connected.Length == 0) { await _host.StopAsync(cancellationToken); _activeDisplays.Clear(); return errors; }
                if (connected.Length == _activeDisplays.Count && connected.All(display => _activeDisplays.TryGetValue(display.Id, out DisplayInfo? previous) && previous == display)) return errors;
                InstalledTemplate? global = _state.GlobalTemplateId is null ? null : _templateResolver(_state.GlobalTemplateId);
                if (global is null) { errors.Add("The saved global wallpaper is no longer installed."); return errors; }
                if (_state.Mode == WallpaperAssignmentMode.Clone) await _host.ApplyCloneAsync(global, await _settingsLoader(global), cancellationToken);
                else await _host.ApplySpanAsync(global, await _settingsLoader(global), cancellationToken);
                RememberDisplays(connected);
                return errors;
            }
            foreach (DisplayInfo display in connected)
            {
                // Never guess when Windows exposes an ambiguous monitor identity.
                if (connected.Count(item => string.Equals(item.AssignmentKey, display.AssignmentKey, StringComparison.OrdinalIgnoreCase)) != 1) continue;
                PersistedWallpaperAssignment? saved = _state.Assignments.FirstOrDefault(item => string.Equals(item.DisplayKey, display.AssignmentKey, StringComparison.OrdinalIgnoreCase));
                if (saved is null) continue;
                if (display.PersistentId is null && !_activeDisplays.ContainsKey(display.Id))
                { errors.Add(Localization.F("MonitorIdentityUnavailableSelectItsWallpaperAgainToRestoreSafelyFormat", display.Name)); continue; }
                if (_activeDisplays.TryGetValue(display.Id, out DisplayInfo? previous) && previous == display && _host.ActiveDisplayIds.Contains(display.Id)) continue;
                InstalledTemplate? template = _templateResolver(saved.TemplateId);
                if (template is null) { errors.Add(Localization.F("SavedWallpaperIsNoLongerInstalledFormat", display.Name, saved.TemplateId)); continue; }
                try
                {
                    await _host.ApplyAsync(template, display.Id, await _settingsLoader(template), cancellationToken);
                    _activeDisplays[display.Id] = display;
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                { errors.Add($"{display.Name}: {exception.Message}"); }
            }
            return errors;
        }
        finally { _gate.Release(); }
    }

    private void RememberDisplays(IEnumerable<DisplayInfo> displays)
    {
        _activeDisplays.Clear();
        foreach (DisplayInfo display in displays) _activeDisplays[display.Id] = display;
    }

    public WallpaperAssignmentService(IWallpaperHost host, IDisplayManager displays, WallpaperAssignmentsStore store, Func<string, InstalledTemplate?> templateResolver, Func<InstalledTemplate, Task<IReadOnlyDictionary<string, object?>>> settingsLoader)
    { _host = host; _displays = displays; _store = store; _templateResolver = templateResolver; _settingsLoader = settingsLoader; }

    public WallpaperAssignmentsDocument State => _state;
    public IReadOnlyList<string> RestoreWarnings { get; private set; } = [];

    public async Task RestoreAsync(IReadOnlyDictionary<string, InstalledTemplate> templates, Func<InstalledTemplate, Task<IReadOnlyDictionary<string, object?>>> settings, CancellationToken cancellationToken = default)
    {
        _state = await _store.LoadAsync(cancellationToken);
        List<string> warnings = [];
        RestoreWarnings = warnings;
        IReadOnlyList<DisplayInfo> connected = _displays.GetDisplays();
        if (_state.Mode is WallpaperAssignmentMode.Clone or WallpaperAssignmentMode.Span)
        {
            if (_state.GlobalTemplateId is not null && templates.TryGetValue(_state.GlobalTemplateId, out InstalledTemplate? global))
            {
                try
                {
                    IReadOnlyDictionary<string, object?> values = await settings(global);
                    if (_state.Mode == WallpaperAssignmentMode.Clone) await _host.ApplyCloneAsync(global, values, cancellationToken);
                    else await _host.ApplySpanAsync(global, values, cancellationToken);
                    RememberDisplays(connected);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                { warnings.Add($"Saved global wallpaper could not be restored: {exception.Message}"); }
            }
            else warnings.Add("The saved global wallpaper is no longer installed.");
            return;
        }
        foreach (PersistedWallpaperAssignment saved in _state.Assignments)
        {
            DisplayInfo[] matches = connected.Where(item => string.Equals(item.AssignmentKey, saved.DisplayKey, StringComparison.OrdinalIgnoreCase)).ToArray();
            DisplayInfo? display = matches.Length == 1 ? matches[0] : null;
            if (display is null)
            {
                warnings.Add($"Saved display '{saved.DisplayName ?? saved.DisplayKey}' is unavailable or requires a new wallpaper selection after the monitor identity upgrade.");
                continue;
            }
            if (display.PersistentId is null)
            {
                warnings.Add(Localization.F("MonitorIdentityUnavailableSelectItsWallpaperAgainToRestoreSafelyFormat", display.Name));
                continue;
            }
            if (display is not null && templates.TryGetValue(saved.TemplateId, out InstalledTemplate? template))
            {
                try
                {
                    await _host.ApplyAsync(template, display.Id, await settings(template), cancellationToken);
                    _activeDisplays[display.Id] = display;
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                { warnings.Add($"{display.Name}: {exception.Message}"); }
            }
            else warnings.Add($"Saved wallpaper '{saved.TemplateId}' is no longer installed.");
        }
    }

    public async Task ApplyAsync(InstalledTemplate template, DisplayInfo display, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_state.Mode == WallpaperAssignmentMode.Span)
            {
                // A local change exits span: first give every connected display the former
                // global template, then replace only the requested display.
                if (_state.GlobalTemplateId is null) throw new InvalidOperationException(Localization.T("TheSpanningWallpaperHasNoTemplateReference"));
                InstalledTemplate previous = _templateResolver(_state.GlobalTemplateId) ?? throw new InvalidOperationException(Localization.T("TheSpanningWallpaperIsNoLongerInstalled"));
                await _host.ApplyCloneAsync(previous, await _settingsLoader(previous), cancellationToken);
                RememberDisplays(_displays.GetDisplays());
                _state = new WallpaperAssignmentsDocument(1, WallpaperAssignmentMode.Independent, null,
                    _displays.GetDisplays().Select(item => new PersistedWallpaperAssignment(item.AssignmentKey, previous.Manifest.Id, item.Name)).ToArray());
            }
            await _host.ApplyAsync(template, display.Id, settings, cancellationToken);
            _activeDisplays[display.Id] = display;
            List<PersistedWallpaperAssignment> assignments = IndependentAssignments().Where(item => !MatchesSelectedDisplay(item, display)).ToList();
            assignments.Add(new PersistedWallpaperAssignment(display.AssignmentKey, template.Manifest.Id, display.Name));
            _state = new WallpaperAssignmentsDocument(1, WallpaperAssignmentMode.Independent, null, assignments);
            try { await _store.SaveAsync(_state, cancellationToken); }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            { throw new InvalidOperationException(Localization.T("TheWallpaperIsActiveButItsAssignmentCouldNotBeSavedApplyItAgainToRetrySaving"), exception); }
        }
        finally { _gate.Release(); }
    }

    public async Task RemoveAsync(DisplayInfo display, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_state.Mode == WallpaperAssignmentMode.Span)
                throw new InvalidOperationException(Localization.T("FirstApplyAWallpaperToThisDisplayToLeaveSpanMode"));
            await _host.StopDisplayAsync(display.Id, cancellationToken);
            _activeDisplays.Remove(display.Id);
            _state = _state with { Mode = WallpaperAssignmentMode.Independent, GlobalTemplateId = null, Assignments = IndependentAssignments().Where(item => !MatchesSelectedDisplay(item, display)).ToArray() };
            await _store.SaveAsync(_state, cancellationToken);
        }
        finally { _gate.Release(); }
    }

    public async Task ApplyGlobalAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, WallpaperAssignmentMode mode, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (mode == WallpaperAssignmentMode.Clone) await _host.ApplyCloneAsync(template, settings, cancellationToken);
            else if (mode == WallpaperAssignmentMode.Span) await _host.ApplySpanAsync(template, settings, cancellationToken);
            else throw new ArgumentOutOfRangeException(nameof(mode));
            _state = new WallpaperAssignmentsDocument(1, mode, template.Manifest.Id, []);
            RememberDisplays(_displays.GetDisplays());
            await _store.SaveAsync(_state, cancellationToken);
        }
        finally { _gate.Release(); }
    }

    private IReadOnlyList<PersistedWallpaperAssignment> IndependentAssignments() =>
        _state.Mode == WallpaperAssignmentMode.Clone && _state.GlobalTemplateId is not null
            ? _displays.GetDisplays().Select(display => new PersistedWallpaperAssignment(display.AssignmentKey, _state.GlobalTemplateId, display.Name)).ToArray()
            : _state.Assignments;

    // Explicit user selection replaces the obsolete session-number record as well.
    // Automatic recovery deliberately never migrates those records by guessing.
    private static bool MatchesSelectedDisplay(PersistedWallpaperAssignment assignment, DisplayInfo display) =>
        string.Equals(assignment.DisplayKey, display.AssignmentKey, StringComparison.OrdinalIgnoreCase)
        || (display.PersistentId is not null && string.Equals(assignment.DisplayKey, display.Id, StringComparison.OrdinalIgnoreCase));
}
