namespace SeeWallpaper.Platform;

/// <summary>Runtime display identity plus the geometry needed to place a wallpaper.</summary>
public sealed record DisplayInfo(string Id, string Name, bool IsPrimary, int Width, int Height, int X = 0, int Y = 0, string? PersistentId = null)
{
    // DeviceName is session-scoped.  Until SetupAPI monitor identities are available, it is
    // deliberately kept as a fallback only; assignments are never matched by enumeration order.
    public string AssignmentKey => PersistentId ?? Id;
    public string Label => $"{Name} ({Width} x {Height})" + (IsPrimary ? " - Primary" : string.Empty);
}

public interface IDisplayManager
{
    IReadOnlyList<DisplayInfo> GetDisplays();
}

public sealed class WindowsDisplayManager : IDisplayManager
{
    public IReadOnlyList<DisplayInfo> GetDisplays() => global::System.Windows.Forms.Screen.AllScreens
        .Select(screen => new DisplayInfo(screen.DeviceName, screen.DeviceName, screen.Primary, screen.Bounds.Width, screen.Bounds.Height, screen.Bounds.X, screen.Bounds.Y, screen.DeviceName))
        .ToArray();
}
