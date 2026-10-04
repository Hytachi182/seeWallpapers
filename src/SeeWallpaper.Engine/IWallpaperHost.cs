using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public interface IWallpaperHost : IAsyncDisposable
{
    Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default);
    Task SetPausedAsync(bool isPaused, CancellationToken cancellationToken = default);
    Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile, CancellationToken cancellationToken = default);
    Task StopAsync(CancellationToken cancellationToken = default);
    Task StopDisplayAsync(string displayId, CancellationToken cancellationToken = default);
    Task ApplyCloneAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default);
    Task ApplySpanAsync(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default);
    IReadOnlyCollection<string> ActiveDisplayIds { get; }
}
