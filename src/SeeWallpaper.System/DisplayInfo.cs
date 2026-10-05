using System.Runtime.InteropServices;

namespace SeeWallpaper.Platform;

/// <summary>Runtime display identity plus the geometry needed to place a wallpaper.</summary>
public sealed record DisplayInfo(string Id, string Name, bool IsPrimary, int Width, int Height, int X = 0, int Y = 0, string? PersistentId = null)
{
    // The monitor interface identifies the Windows device; changing ports can change it.
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
        .Select(screen => new DisplayInfo(screen.DeviceName, screen.DeviceName, screen.Primary, screen.Bounds.Width, screen.Bounds.Height, screen.Bounds.X, screen.Bounds.Y, GetMonitorIdentity(screen.DeviceName)))
        .ToArray();

    private static string? GetMonitorIdentity(string adapter)
    {
        List<string> identities = [];
        for (uint index = 0; ; index++)
        {
            DisplayDevice device = new() { Size = Marshal.SizeOf<DisplayDevice>() };
            if (!EnumDisplayDevices(adapter, index, ref device, 1)) break;
            if ((device.StateFlags & 1) != 0 && !string.IsNullOrWhiteSpace(device.DeviceId)) identities.Add(device.DeviceId);
        }
        return identities.Count == 1 ? identities[0] : null;
    }

    [DllImport("user32.dll", EntryPoint = "EnumDisplayDevicesW", CharSet = CharSet.Unicode)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EnumDisplayDevices(string device, uint index, ref DisplayDevice display, uint flags);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DisplayDevice
    {
        public int Size;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
        public uint StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceId;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
    }
}
