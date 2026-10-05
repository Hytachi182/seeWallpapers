using SeeWallpaper.Engine.Windows;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class DesktopOcclusionTests
{
    private static readonly DesktopMonitor Primary = new(new(0, 0, 3440, 1440), new(0, 0, 3440, 1392));
    private static readonly DesktopMonitor Upper = new(new(0, -1440, 3440, 0), new(0, -1440, 3440, -48));
    private static readonly ScreenRect PrimaryWallpaper = Primary.Bounds;

    [Fact]
    public void Maximized_window_hides_the_wallpaper_of_its_display_only()
    {
        ScreenRect[] covers = [Primary.WorkArea];
        Assert.True(DesktopOcclusion.IsWallpaperHidden(PrimaryWallpaper, [Primary, Upper], covers));
        Assert.False(DesktopOcclusion.IsWallpaperHidden(Upper.Bounds, [Primary, Upper], covers));
    }

    [Fact]
    public void Snapped_windows_together_hide_the_wallpaper()
    {
        ScreenRect[] covers = [new(0, 0, 1720, 1392), new(1720, 0, 3440, 1392)];
        Assert.True(DesktopOcclusion.IsWallpaperHidden(PrimaryWallpaper, [Primary], covers));
    }

    [Fact]
    public void Any_visible_gap_keeps_the_wallpaper_running()
    {
        Assert.False(DesktopOcclusion.IsWallpaperHidden(PrimaryWallpaper, [Primary], [new(0, 0, 1720, 1392), new(1721, 0, 3440, 1392)]));
        Assert.False(DesktopOcclusion.IsWallpaperHidden(PrimaryWallpaper, [Primary], [new(0, 1, 3440, 1392)]));
        Assert.False(DesktopOcclusion.IsWallpaperHidden(PrimaryWallpaper, [Primary], []));
    }

    [Fact]
    public void Spanned_wallpaper_needs_every_display_hidden()
    {
        ScreenRect span = new(0, -1440, 3440, 1440);
        Assert.False(DesktopOcclusion.IsWallpaperHidden(span, [Primary, Upper], [Primary.WorkArea]));
        Assert.True(DesktopOcclusion.IsWallpaperHidden(span, [Primary, Upper], [Primary.WorkArea, Upper.Bounds]));
    }

    [Fact]
    public void Wallpaper_outside_known_displays_is_treated_as_visible()
    {
        Assert.False(DesktopOcclusion.IsWallpaperHidden(new(5000, 0, 6000, 1000), [Primary], [new(5000, 0, 6000, 1000)]));
    }
}
