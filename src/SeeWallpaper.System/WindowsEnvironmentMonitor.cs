using System.Runtime.InteropServices;

namespace SeeWallpaper.Platform;

public sealed record WindowsEnvironmentState(bool IsFullscreenApplicationActive, bool IsOnBattery);

public sealed class WindowsEnvironmentMonitor : IDisposable
{
    private readonly global::System.Threading.Timer _timer;
    private WindowsEnvironmentState? _previous;
    public event EventHandler<WindowsEnvironmentState>? StateChanged;

    public WindowsEnvironmentMonitor(TimeSpan? pollingInterval = null) => _timer = new global::System.Threading.Timer(_ => Poll(), null, TimeSpan.Zero, pollingInterval ?? TimeSpan.FromSeconds(2));

    private void Poll()
    {
        WindowsEnvironmentState state = new(IsFullscreenForegroundWindow(), IsOnBattery());
        if (state == _previous) return;
        _previous = state;
        StateChanged?.Invoke(this, state);
    }

    public void Dispose() => _timer.Dispose();

    private static bool IsOnBattery()
    {
        return GetSystemPowerStatus(out SystemPowerStatus status) && status.AcLineStatus == 0;
    }

    private static bool IsFullscreenForegroundWindow()
    {
        IntPtr foreground = GetForegroundWindow();
        if (foreground == IntPtr.Zero || !GetWindowRect(foreground, out Rect window)) return false;
        IntPtr monitor = MonitorFromWindow(foreground, 2);
        if (monitor == IntPtr.Zero) return false;
        MonitorInfo info = new() { Size = (uint)Marshal.SizeOf<MonitorInfo>() };
        if (!GetMonitorInfo(monitor, ref info)) return false;
        const int tolerance = 2;
        return Math.Abs(window.Left - info.Monitor.Left) <= tolerance && Math.Abs(window.Top - info.Monitor.Top) <= tolerance && Math.Abs(window.Right - info.Monitor.Right) <= tolerance && Math.Abs(window.Bottom - info.Monitor.Bottom) <= tolerance;
    }

    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public uint Size; public Rect Monitor; public Rect Work; public uint Flags; }
    [StructLayout(LayoutKind.Sequential)] private struct SystemPowerStatus { public byte AcLineStatus; public byte BatteryFlag; public byte BatteryLifePercent; public byte SystemStatusFlag; public uint BatteryLifeTime; public uint BatteryFullLifeTime; }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out Rect rectangle);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MonitorInfo monitorInfo);
    [DllImport("kernel32.dll")] private static extern bool GetSystemPowerStatus(out SystemPowerStatus status);
}
