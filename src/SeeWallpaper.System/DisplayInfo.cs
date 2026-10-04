namespace SeeWallpaper.Platform;

public sealed record DisplayInfo(string Id, string Name, bool IsPrimary, int Width, int Height);

public interface IDisplayManager
{
    IReadOnlyList<DisplayInfo> GetDisplays();
}

public sealed class WindowsDisplayManager : IDisplayManager
{
    public IReadOnlyList<DisplayInfo> GetDisplays() => global::System.Windows.Forms.Screen.AllScreens
        .Select(screen => new DisplayInfo(screen.DeviceName, screen.DeviceName, screen.Primary, screen.Bounds.Width, screen.Bounds.Height))
        .ToArray();
}
