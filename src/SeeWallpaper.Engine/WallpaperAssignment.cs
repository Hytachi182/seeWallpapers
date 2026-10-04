using SeeWallpaper.Core;

namespace SeeWallpaper.Engine;

public sealed record WallpaperBounds(int X, int Y, int Width, int Height)
{
    public static WallpaperBounds FromScreen(global::System.Windows.Forms.Screen screen) => new(screen.Bounds.X, screen.Bounds.Y, screen.Bounds.Width, screen.Bounds.Height);
}

public sealed record WallpaperAssignment(string DisplayId, InstalledTemplate Template, IReadOnlyDictionary<string, object?> Settings, WallpaperBounds Bounds);
