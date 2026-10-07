using System.Windows;
using SeeWallpaper.Core;
using SeeWallpaper.Engine.Windows;
using SeeWallpaper.Platform;

namespace SeeWallpaper.Engine;

public sealed class DesktopWallpaperHost : IWallpaperHost
{
    private readonly Dictionary<string, WebWallpaperWindow> _wallpaperWindows = [];
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private bool _isPaused;
    private readonly SemaphoreSlim _operationLock = new(1, 1);
    private readonly Dictionary<WebWallpaperWindow, DateTime> _coveredSince = [];
    private DesktopOcclusionWatcher? _occlusionWatcher;
    // Hiding is confirmed briefly before pausing; revealing resumes on the next check.
    private static readonly TimeSpan OcclusionConfirmation = TimeSpan.FromMilliseconds(400);

    public IReadOnlyCollection<string> ActiveDisplayIds => _wallpaperWindows.Keys.ToArray();

    public async Task UpdateTemplateSettingsAsync(string templateId, IReadOnlyDictionary<string, object?> settings)
    {
        await _operationLock.WaitAsync();
        try
        {
            foreach (WebWallpaperWindow window in _wallpaperWindows.Values.Where(window => window.TemplateId == templateId))
                await window.UpdateSettingsAsync(settings);
        }
        finally { _operationLock.Release(); }
    }

    public async Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        DisplayInfo? display = new WindowsDisplayManager().GetDisplays().FirstOrDefault(candidate => string.Equals(candidate.Id, displayId, StringComparison.OrdinalIgnoreCase));
        if (display is null) throw new InvalidOperationException($"Display '{displayId}' is no longer available.");
        await ApplyOneAsync(new WallpaperAssignment(displayId, template, settings, WallpaperBounds.FromDisplay(display)), cancellationToken);
    }

    public async Task ApplyAssignmentsAsync(IEnumerable<WallpaperAssignment> assignments, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(assignments);
        cancellationToken.ThrowIfCancellationRequested();
        WallpaperAssignment[] replacement = assignments.ToArray();
        await _operationLock.WaitAsync(cancellationToken);
        try
        {
            // Global transitions intentionally replace every instance only after each new
            // instance has completed WebView navigation and shell attachment.
            List<(WallpaperAssignment Assignment, WebWallpaperWindow Window)> prepared = [];
            try
            {
                foreach (WallpaperAssignment assignment in replacement)
                {
                    WebWallpaperWindow window = await CreateReadyWindowAsync(assignment, cancellationToken);
                    prepared.Add((assignment, window));
                }
            }
            catch { foreach ((_, WebWallpaperWindow window) in prepared) window.Close(); throw; }
            StopCore();
            foreach ((WallpaperAssignment assignment, WebWallpaperWindow window) in prepared) _wallpaperWindows.Add(assignment.DisplayId, window);
            UpdateOcclusionWatcher();
        }
        finally { _operationLock.Release(); }
    }

    public Task ApplyCloneAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        IEnumerable<WallpaperAssignment> assignments = new WindowsDisplayManager().GetDisplays().Select(display => new WallpaperAssignment(display.Id, template, settings, WallpaperBounds.FromDisplay(display)));
        return ApplyAssignmentsAsync(assignments, cancellationToken);
    }

    public Task ApplySpanAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<DisplayInfo> displays = new WindowsDisplayManager().GetDisplays();
        return ApplyAssignmentsAsync([new WallpaperAssignment("span", template, settings, WallpaperBounds.Span(displays))], cancellationToken);
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        await _operationLock.WaitAsync(cancellationToken);
        try { StopCore(); }
        finally { _operationLock.Release(); }
    }

    public async Task StopDisplayAsync(string displayId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await _operationLock.WaitAsync(cancellationToken);
        try
        {
            if (_wallpaperWindows.Remove(displayId, out WebWallpaperWindow? window)) window.Close();
            UpdateOcclusionWatcher();
        }
        finally { _operationLock.Release(); }
    }

    public async Task SetPausedAsync(bool isPaused, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _isPaused = isPaused;
        foreach (WebWallpaperWindow window in _wallpaperWindows.Values.ToArray()) await window.SetPausedAsync(isPaused);
    }

    public async Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _performanceProfile = profile;
        foreach (WebWallpaperWindow window in _wallpaperWindows.Values.ToArray()) await window.SetPerformanceProfileAsync(profile);
    }

    public async ValueTask DisposeAsync()
    {
        await StopAsync();
    }

    private void StopCore()
    {
        foreach (WebWallpaperWindow window in _wallpaperWindows.Values) window.Close();
        _wallpaperWindows.Clear();
        UpdateOcclusionWatcher();
    }

    private void UpdateOcclusionWatcher()
    {
        foreach (WebWallpaperWindow window in _coveredSince.Keys.Except(_wallpaperWindows.Values).ToArray()) _coveredSince.Remove(window);
        if (_wallpaperWindows.Count == 0)
        {
            _occlusionWatcher?.Dispose();
            _occlusionWatcher = null;
            return;
        }
        _occlusionWatcher ??= new DesktopOcclusionWatcher(CheckOcclusion);
        _occlusionWatcher.RequestCheck();
    }

    private async void CheckOcclusion()
    {
        try
        {
            var desktop = DesktopOcclusion.CaptureDesktop();
            DateTime now = DateTime.UtcNow;
            bool confirmLater = false;
            foreach (WebWallpaperWindow window in _wallpaperWindows.Values.ToArray())
            {
                bool hidden = desktop is { } snapshot && window.IsAttachedToDesktop
                    && DesktopOcclusion.TryGetWindowBounds(window.Handle, out ScreenRect bounds)
                    && DesktopOcclusion.IsWallpaperHidden(bounds, snapshot.Monitors, snapshot.Covers);
                if (!hidden)
                {
                    _coveredSince.Remove(window);
                    await window.SetOccludedAsync(false);
                    continue;
                }
                if (!_coveredSince.TryGetValue(window, out DateTime since)) _coveredSince[window] = since = now;
                if (now - since >= OcclusionConfirmation) await window.SetOccludedAsync(true);
                else confirmLater = true;
            }
            if (confirmLater) _occlusionWatcher?.RequestCheck();
        }
        catch (Exception exception)
        {
            // Occlusion only saves resources; a failed check must never stop a wallpaper.
            global::System.Diagnostics.Trace.TraceError($"Wallpaper occlusion check failed: {exception}");
            _coveredSince.Clear();
            foreach (WebWallpaperWindow window in _wallpaperWindows.Values.ToArray())
            {
                try { await window.SetOccludedAsync(false); }
                catch (Exception) { }
            }
        }
    }

    private async Task ApplyOneAsync(WallpaperAssignment assignment, CancellationToken cancellationToken)
    {
        await _operationLock.WaitAsync(cancellationToken);
        try
        {
            // Keep the prior wallpaper running unless the replacement is proven ready.
            WebWallpaperWindow wallpaperWindow = await CreateReadyWindowAsync(assignment, cancellationToken);
            if (_wallpaperWindows.Remove(assignment.DisplayId, out WebWallpaperWindow? existing)) existing.Close();
            _wallpaperWindows.Add(assignment.DisplayId, wallpaperWindow);
            UpdateOcclusionWatcher();
        }
        finally { _operationLock.Release(); }
    }

    private async Task<WebWallpaperWindow> CreateReadyWindowAsync(WallpaperAssignment assignment, CancellationToken cancellationToken)
    {
        WebWallpaperWindow wallpaperWindow = new(assignment.Template, assignment.Settings, attachToDesktop: true, assignment.Bounds);
        wallpaperWindow.Show();
        try
        {
            await wallpaperWindow.WaitUntilReadyAsync(cancellationToken);
            await wallpaperWindow.SetPerformanceProfileAsync(_performanceProfile);
            await wallpaperWindow.SetPausedAsync(_isPaused);
            return wallpaperWindow;
        }
        catch { wallpaperWindow.Close(); throw; }
    }
}
