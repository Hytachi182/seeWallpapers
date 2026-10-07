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
    public IReadOnlyList<DisplayInfo> GetDisplays()
    {
        // Screen.AllScreens caches geometry obtained in the caller's DPI context.
        // Explorer attachment can change that context between successive wallpapers.
        using DisplayDpiContext dpi = DisplayDpiContext.PhysicalPixels();
        List<DisplayInfo> displays = [];
        Exception? failure = null;
        bool success = EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, (monitor, _, _, _) =>
        {
            MonitorInfo info = new() { Size = Marshal.SizeOf<MonitorInfo>() };
            if (!GetMonitorInfo(monitor, ref info))
            {
                failure = new System.ComponentModel.Win32Exception(Marshal.GetLastPInvokeError(), "Read monitor bounds");
                return false;
            }
            int width = info.Monitor.Right - info.Monitor.Left, height = info.Monitor.Bottom - info.Monitor.Top;
            if (width > 0 && height > 0)
                displays.Add(new DisplayInfo(info.Device, info.Device, (info.Flags & 1) != 0, width, height,
                    info.Monitor.Left, info.Monitor.Top, GetMonitorIdentity(info.Device)));
            return true;
        }, IntPtr.Zero);
        if (failure is not null) throw failure;
        if (!success) throw new System.ComponentModel.Win32Exception(Marshal.GetLastPInvokeError(), "Enumerate monitors");
        return displays;
    }

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

    private delegate bool MonitorCallback(IntPtr monitor, IntPtr dc, IntPtr rectangle, IntPtr data);
    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EnumDisplayMonitors(IntPtr dc, IntPtr clip, MonitorCallback callback, IntPtr data);
    [DllImport("user32.dll", EntryPoint = "GetMonitorInfoW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [StructLayout(LayoutKind.Sequential)]
    private struct NativeRect { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct MonitorInfo
    {
        public int Size;
        public NativeRect Monitor;
        public NativeRect WorkArea;
        public uint Flags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string Device;
    }

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
