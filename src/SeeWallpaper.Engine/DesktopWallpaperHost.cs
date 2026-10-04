using System.Windows;
using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public sealed class DesktopWallpaperHost : IWallpaperHost
{
    private readonly Dictionary<string, WebWallpaperWindow> _wallpaperWindows = [];
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private bool _isPaused;

    public Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        global::System.Windows.Forms.Screen? screen = global::System.Windows.Forms.Screen.AllScreens.FirstOrDefault(candidate => string.Equals(candidate.DeviceName, displayId, StringComparison.OrdinalIgnoreCase));
        if (screen is null) throw new InvalidOperationException($"Display '{displayId}' is no longer available.");
        ApplyCore(new WallpaperAssignment(displayId, template, settings, WallpaperBounds.FromScreen(screen)));
        return Task.CompletedTask;
    }

    public Task ApplyAssignmentsAsync(IEnumerable<WallpaperAssignment> assignments, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(assignments);
        cancellationToken.ThrowIfCancellationRequested();
        StopCore();
        foreach (WallpaperAssignment assignment in assignments) ApplyCore(assignment);
        return Task.CompletedTask;
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

    private void ApplyCore(WallpaperAssignment assignment)
    {
        if (_wallpaperWindows.Remove(assignment.DisplayId, out WebWallpaperWindow? existing)) existing.Close();
        WebWallpaperWindow wallpaperWindow = new(assignment.Template, assignment.Settings, attachToDesktop: true, assignment.Bounds);
        _wallpaperWindows.Add(assignment.DisplayId, wallpaperWindow);
        wallpaperWindow.Show();
        _ = wallpaperWindow.SetPerformanceProfileAsync(_performanceProfile);
        _ = wallpaperWindow.SetPausedAsync(_isPaused);
    }
}
