using System.Windows;
using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public sealed class WallpaperPreviewWindow : WebWallpaperWindow
{
    public WallpaperPreviewWindow(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings) : base(template, settings, attachToDesktop: false)
    {
        Title = $"Preview — {template.Manifest.Name}";
        Width = 1100;
        Icon = System.Windows.Application.Current?.TryFindResource("BrandIcon") as System.Windows.Media.ImageSource;
        Height = 700;
        MinWidth = 420;
        MinHeight = 280;
        WindowStyle = WindowStyle.SingleBorderWindow;
        ResizeMode = ResizeMode.CanResize;
        ShowInTaskbar = true;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        PreviewKeyDown += (_, eventArgs) =>
        {
            if (eventArgs.Key == System.Windows.Input.Key.Escape)
            {
                eventArgs.Handled = true;
                Close();
            }
        };
    }
}
