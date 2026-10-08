using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using SeeWallpaper.Platform;

namespace SeeWallpaper.Engine.Windows;

internal static class DesktopSurface
{
    private const uint SpawnWorkerMessage = 0x052C;
    private const uint SmtoAbortIfHung = 0x0002;
    private const int GwlStyle = -16;
    private const long WsChild = 0x40000000;
    private const long WsPopup = 0x80000000;
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpFrameChanged = 0x0020;
    private const uint SwpShowWindow = 0x0040;

    internal static bool IsWallpaperAttached(IntPtr wallpaperHandle)
    {
        if (!IsWindow(wallpaperHandle)) return false;
        IntPtr parent = GetParent(wallpaperHandle);
        if (parent == IntPtr.Zero || !IsWindow(parent)) return false;
        StringBuilder className = new(256);
        return GetClassName(parent, className, className.Capacity) > 0
            && className.ToString() == "WorkerW" && IsWallpaperSurface(parent);
    }

    public static void AttachBehindDesktopIcons(IntPtr wallpaperHandle, WallpaperBounds bounds, bool showWindow = true)
    {
        IntPtr host = GetWallpaperHost();

        long style = GetWindowLongPtr(wallpaperHandle, GwlStyle).ToInt64();
        Marshal.SetLastPInvokeError(0);
        IntPtr previousStyle = SetWindowLongPtr(wallpaperHandle, GwlStyle, new IntPtr((style & ~WsPopup) | WsChild));
        if (previousStyle == IntPtr.Zero && Marshal.GetLastPInvokeError() != 0) throw NativeFailure("Prepare the wallpaper window");
        Marshal.SetLastPInvokeError(0);
        IntPtr previousParent = SetParent(wallpaperHandle, host);
        if (previousParent == IntPtr.Zero && Marshal.GetLastPInvokeError() != 0) throw NativeFailure("Attach the wallpaper to the Windows desktop");
        if (GetParent(wallpaperHandle) != host) throw new InvalidOperationException("Windows did not confirm that the wallpaper was attached to the desktop.");
        // SetParent can reset DPI awareness. Convert and place AFTER it, with
        // origins and sizes in physical pixels on every monitor.
        using DisplayDpiContext dpi = DisplayDpiContext.PhysicalPixels();
        Point position = new() { X = bounds.X, Y = bounds.Y };
        if (!ScreenToClient(host, ref position)) throw NativeFailure("Convert the display position");
        uint flags = SwpNoActivate | SwpFrameChanged | (showWindow ? SwpShowWindow : 0);
        if (!SetWindowPos(wallpaperHandle, IntPtr.Zero, position.X, position.Y, bounds.Width, bounds.Height, flags))
            throw NativeFailure("Position the wallpaper on the selected display");
    }

    internal static void PositionInPhysicalPixels(IntPtr window, WallpaperBounds bounds)
    {
        using DisplayDpiContext dpi = DisplayDpiContext.PhysicalPixels();
        if (!SetWindowPos(window, IntPtr.Zero, bounds.X, bounds.Y, bounds.Width, bounds.Height, SwpNoActivate | 0x0004))
            throw NativeFailure("Prepare the wallpaper at the selected display bounds");
    }

    internal static IntPtr GetWallpaperHost()
    {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) throw new InvalidOperationException("The Windows desktop is unavailable. Try again when Windows Explorer is ready.");
        // Reuse an existing surface before asking Explorer to create one.
        IntPtr host = FindWallpaperHost(progman);
        if (host != IntPtr.Zero) return host;
        SendMessageTimeout(progman, SpawnWorkerMessage, IntPtr.Zero, IntPtr.Zero, SmtoAbortIfHung, 1000, out _);
        host = FindWallpaperHost(progman);
        if (host == IntPtr.Zero)
        {
            // Some Explorer versions require the explicit enable sequence.
            SendMessageTimeout(progman, SpawnWorkerMessage, new IntPtr(0xD), IntPtr.Zero, SmtoAbortIfHung, 1000, out _);
            SendMessageTimeout(progman, SpawnWorkerMessage, new IntPtr(0xD), new IntPtr(1), SmtoAbortIfHung, 1000, out _);
            host = FindWallpaperHost(progman);
        }
        if (host == IntPtr.Zero) throw new InvalidOperationException("The Windows wallpaper surface could not be found. Try again when Windows Explorer is ready.");
        return host;
    }

    private static IntPtr FindWallpaperHost(IntPtr progman)
    {
        // Modern Explorer: DefView and the wallpaper WorkerW are siblings inside Progman.
        if (FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero)
        {
            IntPtr child = IntPtr.Zero;
            while ((child = FindWindowEx(progman, child, "WorkerW", null)) != IntPtr.Zero)
                if (IsWallpaperSurface(child)) return child;
        }
        // Classic Explorer: the wallpaper WorkerW follows the top-level icon host.
        IntPtr result = IntPtr.Zero;
        EnumWindows((topLevel, _) =>
        {
            if (FindWindowEx(topLevel, IntPtr.Zero, "SHELLDLL_DefView", null) == IntPtr.Zero) return true;
            IntPtr candidate = FindWindowEx(IntPtr.Zero, topLevel, "WorkerW", null);
            if (candidate != IntPtr.Zero && IsWallpaperSurface(candidate)) result = candidate;
            return result == IntPtr.Zero;
        }, IntPtr.Zero);
        return result;
    }

    private static bool IsWallpaperSurface(IntPtr handle) =>
        FindWindowEx(handle, IntPtr.Zero, "SHELLDLL_DefView", null) == IntPtr.Zero &&
        GetWindowRect(handle, out Rect bounds) && bounds.Right > bounds.Left && bounds.Bottom > bounds.Top;

    private static Win32Exception NativeFailure(string operation) => new(Marshal.GetLastPInvokeError(), operation);
    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct Point { public int X; public int Y; }
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern IntPtr FindWindow(string? className, string? windowName);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string? className, string? windowTitle);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetParent(IntPtr child, IntPtr newParent);
    [DllImport("user32.dll")] private static extern IntPtr GetParent(IntPtr child);
    [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr window, StringBuilder className, int maxCount);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool ScreenToClient(IntPtr hWnd, ref Point point);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool GetWindowRect(IntPtr hWnd, out Rect rectangle);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)] private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)] private static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int index, IntPtr value);
    [DllImport("user32.dll", EntryPoint = "SendMessageTimeoutW", SetLastError = true)] private static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
