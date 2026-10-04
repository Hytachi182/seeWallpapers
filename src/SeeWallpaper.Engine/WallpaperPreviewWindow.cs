using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public sealed class WallpaperPreviewWindow : WebWallpaperWindow
{
    public WallpaperPreviewWindow(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings) : base(template, settings, attachToDesktop: false)
    {
        Title = $"Preview — {template.Manifest.Name}";
        Width = 1100;
        Height = 700;
        WindowStartupLocation = System.Windows.WindowStartupLocation.CenterOwner;
    }
}
