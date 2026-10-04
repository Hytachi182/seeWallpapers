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

    public WallpaperAssignmentService(IWallpaperHost host, IDisplayManager displays, WallpaperAssignmentsStore store, Func<string, InstalledTemplate?> templateResolver, Func<InstalledTemplate, Task<IReadOnlyDictionary<string, object?>>> settingsLoader)
    { _host = host; _displays = displays; _store = store; _templateResolver = templateResolver; _settingsLoader = settingsLoader; }

    public WallpaperAssignmentsDocument State => _state;

    public async Task RestoreAsync(IReadOnlyDictionary<string, InstalledTemplate> templates, Func<InstalledTemplate, Task<IReadOnlyDictionary<string, object?>>> settings, CancellationToken cancellationToken = default)
    {
        _state = await _store.LoadAsync(cancellationToken);
        IReadOnlyList<DisplayInfo> connected = _displays.GetDisplays();
        if (_state.Mode is WallpaperAssignmentMode.Clone or WallpaperAssignmentMode.Span)
        {
            if (_state.GlobalTemplateId is not null && templates.TryGetValue(_state.GlobalTemplateId, out InstalledTemplate? global))
            {
                IReadOnlyDictionary<string, object?> values = await settings(global);
                if (_state.Mode == WallpaperAssignmentMode.Clone) await _host.ApplyCloneAsync(global, values, cancellationToken);
                else await _host.ApplySpanAsync(global, values, cancellationToken);
            }
            return;
        }
        foreach (PersistedWallpaperAssignment saved in _state.Assignments)
        {
            DisplayInfo? display = connected.SingleOrDefault(item => string.Equals(item.AssignmentKey, saved.DisplayKey, StringComparison.OrdinalIgnoreCase));
            if (display is not null && templates.TryGetValue(saved.TemplateId, out InstalledTemplate? template))
                await _host.ApplyAsync(template, display.Id, await settings(template), cancellationToken);
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
                if (_state.GlobalTemplateId is null) throw new InvalidOperationException("The spanning wallpaper has no template reference.");
                InstalledTemplate previous = _templateResolver(_state.GlobalTemplateId) ?? throw new InvalidOperationException("The spanning wallpaper is no longer installed.");
                await _host.ApplyCloneAsync(previous, await _settingsLoader(previous), cancellationToken);
                _state = new WallpaperAssignmentsDocument(1, WallpaperAssignmentMode.Independent, null,
                    _displays.GetDisplays().Select(item => new PersistedWallpaperAssignment(item.AssignmentKey, previous.Manifest.Id, item.Name)).ToArray());
            }
            await _host.ApplyAsync(template, display.Id, settings, cancellationToken);
            List<PersistedWallpaperAssignment> assignments = IndependentAssignments().Where(item => !string.Equals(item.DisplayKey, display.AssignmentKey, StringComparison.OrdinalIgnoreCase)).ToList();
            assignments.Add(new PersistedWallpaperAssignment(display.AssignmentKey, template.Manifest.Id, display.Name));
            _state = new WallpaperAssignmentsDocument(1, WallpaperAssignmentMode.Independent, null, assignments);
            try { await _store.SaveAsync(_state, cancellationToken); }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            { throw new InvalidOperationException("The wallpaper is active, but its assignment could not be saved. Apply it again to retry saving.", exception); }
        }
        finally { _gate.Release(); }
    }

    public async Task RemoveAsync(DisplayInfo display, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_state.Mode == WallpaperAssignmentMode.Span)
                throw new InvalidOperationException("Installez d'abord un screener sur cet écran pour quitter le mode étendu.");
            await _host.StopDisplayAsync(display.Id, cancellationToken);
            _state = _state with { Mode = WallpaperAssignmentMode.Independent, GlobalTemplateId = null, Assignments = IndependentAssignments().Where(item => !string.Equals(item.DisplayKey, display.AssignmentKey, StringComparison.OrdinalIgnoreCase)).ToArray() };
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
            await _store.SaveAsync(_state, cancellationToken);
        }
        finally { _gate.Release(); }
    }

    private IReadOnlyList<PersistedWallpaperAssignment> IndependentAssignments() =>
        _state.Mode == WallpaperAssignmentMode.Clone && _state.GlobalTemplateId is not null
            ? _displays.GetDisplays().Select(display => new PersistedWallpaperAssignment(display.AssignmentKey, _state.GlobalTemplateId, display.Name)).ToArray()
            : _state.Assignments;
}
