using System.ComponentModel;
using System.Runtime.InteropServices;

namespace SeeWallpaper.Platform;

/// <summary>A synchronous native-call scope. Never keep this across an await.</summary>
public sealed class DisplayDpiContext : IDisposable
{
    private readonly IntPtr _previous;
    private bool _disposed;

    private DisplayDpiContext()
    {
        _previous = SetThreadDpiAwarenessContext(new IntPtr(-4)); // Per-monitor V2: physical pixels.
        if (_previous == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastPInvokeError(), "Read display geometry in physical pixels");
    }

    public static DisplayDpiContext PhysicalPixels() => new();

    public void Dispose()
    {
        if (_disposed) return;
        SetThreadDpiAwarenessContext(_previous);
        _disposed = true;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
