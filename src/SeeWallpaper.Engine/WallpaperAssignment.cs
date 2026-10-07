using SeeWallpaper.Core;
using SeeWallpaper.Platform;

namespace SeeWallpaper.Engine;

public sealed record WallpaperBounds(int X, int Y, int Width, int Height)
{
    public static WallpaperBounds FromDisplay(DisplayInfo display) => new(display.X, display.Y, display.Width, display.Height);

    public static WallpaperBounds Span(IEnumerable<DisplayInfo> displays)
    {
        DisplayInfo[] connected = displays.ToArray();
        if (connected.Length == 0) throw new InvalidOperationException("No Windows display is available.");
        int left = connected.Min(display => display.X), top = connected.Min(display => display.Y);
        int right = connected.Max(display => display.X + display.Width), bottom = connected.Max(display => display.Y + display.Height);
        return new WallpaperBounds(left, top, right - left, bottom - top);
    }
}

public sealed record WallpaperAssignment(string DisplayId, InstalledTemplate Template, IReadOnlyDictionary<string, object?> Settings, WallpaperBounds Bounds);
