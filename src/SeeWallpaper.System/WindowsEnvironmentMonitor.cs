using System.Runtime.InteropServices;
using System.Text;

namespace SeeWallpaper.Platform;

public sealed record WindowsEnvironmentState(bool IsFullscreenApplicationActive, bool IsOnBattery);

public sealed class WindowsEnvironmentMonitor : IDisposable
{
    private readonly global::System.Threading.Timer _timer;
    private readonly TimeSpan _pollingInterval;
    private readonly Func<WindowsEnvironmentState> _readState;
    private readonly object _pollGate = new();
    private WindowsEnvironmentState? _previous;
    private bool _disposed;
    public event EventHandler<WindowsEnvironmentState>? StateChanged;

    public WindowsEnvironmentMonitor(TimeSpan? pollingInterval = null)
        : this(() => new(IsFullscreenForegroundWindow(), IsOnBattery()), pollingInterval) { }

    internal WindowsEnvironmentMonitor(Func<WindowsEnvironmentState> readState, TimeSpan? pollingInterval = null)
    {
        _readState = readState;
        _pollingInterval = pollingInterval ?? TimeSpan.FromSeconds(2);
        _timer = new global::System.Threading.Timer(_ => Poll(), null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
    }

    /// <summary>Returns the initial state before polling for subsequent changes.</summary>
    public WindowsEnvironmentState Start()
    {
        lock (_pollGate)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            WindowsEnvironmentState state = _readState();
            _previous = state;
            _timer.Change(_pollingInterval, _pollingInterval);
            return state;
        }
    }

    private void Poll()
    {
        lock (_pollGate)
        {
            if (_disposed) return;
            WindowsEnvironmentState state = _readState();
            if (state == _previous) return;
            _previous = state;
            StateChanged?.Invoke(this, state);
        }
    }

    public void Dispose()
    {
        lock (_pollGate)
        {
            _disposed = true;
            _timer.Dispose();
        }
    }

    private static bool IsOnBattery()
    {
        return GetSystemPowerStatus(out SystemPowerStatus status) && status.AcLineStatus == 0;
    }

    private static bool IsFullscreenForegroundWindow()
    {
        IntPtr foreground = GetForegroundWindow();
        if (foreground == IntPtr.Zero) return false;
        // Desktop clicks can activate Explorer's screen-sized shell window. It is
        // never a fullscreen application, even when its bounds match one monitor.
        IntPtr root = GetAncestor(foreground, 2); // GA_ROOT
        if (root == IntPtr.Zero) return false;
        if (root == GetShellWindow() || root == GetDesktopWindow()) return false;
        StringBuilder className = new(256);
        if (GetClassName(root, className, className.Capacity) == 0) return false;
        if (!GetWindowRect(foreground, out Rect window)) return false;
        IntPtr monitor = MonitorFromWindow(foreground, 2);
        if (monitor == IntPtr.Zero) return false;
        MonitorInfo info = new() { Size = (uint)Marshal.SizeOf<MonitorInfo>() };
        if (!GetMonitorInfo(monitor, ref info)) return false;
        return IsFullscreenWindow(className.ToString(), window, info.Monitor);
    }

    internal static bool IsFullscreenWindow(string windowClass, Rect window, Rect monitor)
    {
        if (string.IsNullOrEmpty(windowClass) || windowClass is "Progman" or "WorkerW" or "SHELLDLL_DefView" or "SysListView32" or "Shell_TrayWnd" or "Shell_SecondaryTrayWnd") return false;
        if (window.Right <= window.Left || window.Bottom <= window.Top || monitor.Right <= monitor.Left || monitor.Bottom <= monitor.Top) return false;
        const int tolerance = 2;
        return Math.Abs(window.Left - monitor.Left) <= tolerance && Math.Abs(window.Top - monitor.Top) <= tolerance && Math.Abs(window.Right - monitor.Right) <= tolerance && Math.Abs(window.Bottom - monitor.Bottom) <= tolerance;
    }

    [StructLayout(LayoutKind.Sequential)] internal struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public uint Size; public Rect Monitor; public Rect Work; public uint Flags; }
    [StructLayout(LayoutKind.Sequential)] private struct SystemPowerStatus { public byte AcLineStatus; public byte BatteryFlag; public byte BatteryLifePercent; public byte SystemStatusFlag; public uint BatteryLifeTime; public uint BatteryFullLifeTime; }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern IntPtr GetAncestor(IntPtr hWnd, uint flags);
    [DllImport("user32.dll")] private static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] private static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out Rect rectangle);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MonitorInfo monitorInfo);
    [DllImport("kernel32.dll")] private static extern bool GetSystemPowerStatus(out SystemPowerStatus status);
}
