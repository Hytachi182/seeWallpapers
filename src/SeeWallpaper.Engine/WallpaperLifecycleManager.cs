using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public sealed class WallpaperLifecycleManager(IWallpaperHost wallpaperHost)
{
    public Task ApplyAsync(InstalledTemplate template, string displayId, IReadOnlyDictionary<string, object?> settings, CancellationToken cancellationToken = default) => wallpaperHost.ApplyAsync(template, displayId, settings, cancellationToken);
    public Task StopAsync(CancellationToken cancellationToken = default) => wallpaperHost.StopAsync(cancellationToken);
}
