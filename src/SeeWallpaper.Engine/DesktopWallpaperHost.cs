using System.Windows;
using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public sealed class DesktopWallpaperHost : IWallpaperHost
{
    private readonly Dictionary<string, WebWallpaperWindow> _wallpaperWindows = [];
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private bool _isPaused;
    private readonly SemaphoreSlim _operationLock = new(1, 1);

    public IReadOnlyCollection<string> ActiveDisplayIds => _wallpaperWindows.Keys.ToArray();

    public async Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        global::System.Windows.Forms.Screen? screen = global::System.Windows.Forms.Screen.AllScreens.FirstOrDefault(candidate => string.Equals(candidate.DeviceName, displayId, StringComparison.OrdinalIgnoreCase));
        if (screen is null) throw new InvalidOperationException($"Display '{displayId}' is no longer available.");
        await ApplyOneAsync(new WallpaperAssignment(displayId, template, settings, WallpaperBounds.FromScreen(screen)), cancellationToken);
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
        }
        finally { _operationLock.Release(); }
    }

    public Task ApplyCloneAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        IEnumerable<WallpaperAssignment> assignments = global::System.Windows.Forms.Screen.AllScreens.Select(screen => new WallpaperAssignment(screen.DeviceName, template, settings, WallpaperBounds.FromScreen(screen)));
        return ApplyAssignmentsAsync(assignments, cancellationToken);
    }

    public Task ApplySpanAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        global::System.Windows.Forms.Screen[] screens = global::System.Windows.Forms.Screen.AllScreens;
        if (screens.Length == 0) throw new InvalidOperationException("No Windows display is available.");
        int left = screens.Min(screen => screen.Bounds.Left);
        int top = screens.Min(screen => screen.Bounds.Top);
        int right = screens.Max(screen => screen.Bounds.Right);
        int bottom = screens.Max(screen => screen.Bounds.Bottom);
        return ApplyAssignmentsAsync([new WallpaperAssignment("span", template, settings, new WallpaperBounds(left, top, right - left, bottom - top))], cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        StopCore();
        return Task.CompletedTask;
    }

    public async Task StopDisplayAsync(string displayId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await _operationLock.WaitAsync(cancellationToken);
        try
        {
            if (_wallpaperWindows.Remove(displayId, out WebWallpaperWindow? window)) window.Close();
        }
        finally { _operationLock.Release(); }
    }

    public async Task SetPausedAsync(bool isPaused, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _isPaused = isPaused;
        foreach (WebWallpaperWindow window in _wallpaperWindows.Values) await window.SetPausedAsync(isPaused);
    }

    public async Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _performanceProfile = profile;
        foreach (WebWallpaperWindow window in _wallpaperWindows.Values) await window.SetPerformanceProfileAsync(profile);
    }

    public ValueTask DisposeAsync()
    {
        StopCore();
        return ValueTask.CompletedTask;
    }

    private void StopCore()
    {
        foreach (WebWallpaperWindow window in _wallpaperWindows.Values) window.Close();
        _wallpaperWindows.Clear();
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
