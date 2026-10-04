using System.Runtime.InteropServices;

namespace SeeWallpaper.Engine.Windows;

internal static class DesktopSurface
{
    private const uint SpawnWorkerMessage = 0x052C;
    private const uint SmtoNormal = 0x0000;
    private const int GwlStyle = -16;
    private const int WsChild = unchecked((int)0x40000000);
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpShowWindow = 0x0040;
    public static void AttachBehindDesktopIcons(IntPtr wallpaperHandle, WallpaperBounds bounds)
    {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) throw new InvalidOperationException("Windows desktop shell (Progman) is unavailable.");
        SendMessageTimeout(progman, SpawnWorkerMessage, IntPtr.Zero, IntPtr.Zero, SmtoNormal, 1000, out _);
        IntPtr workerW = FindWallpaperWorkerW();
        if (workerW == IntPtr.Zero) throw new InvalidOperationException("Windows wallpaper host (WorkerW) is unavailable.");

        if (!GetWindowRect(workerW, out Rect workerBounds)) throw new InvalidOperationException("Unable to read the Windows wallpaper host bounds.");
        SetWindowLongPtr(wallpaperHandle, GwlStyle, (IntPtr)(GetWindowLongPtr(wallpaperHandle, GwlStyle).ToInt64() | WsChild));
        SetParent(wallpaperHandle, workerW);
        SetWindowPos(wallpaperHandle, IntPtr.Zero, bounds.X - workerBounds.Left, bounds.Y - workerBounds.Top, bounds.Width, bounds.Height, SwpNoActivate | SwpShowWindow);
    }

    private static IntPtr FindWallpaperWorkerW()
    {
        IntPtr result = IntPtr.Zero;
        EnumWindows((topLevel, _) =>
        {
            if (FindWindowEx(topLevel, IntPtr.Zero, "SHELLDLL_DefView", null) == IntPtr.Zero) return true;
            result = FindWindowEx(IntPtr.Zero, topLevel, "WorkerW", null);
            return result == IntPtr.Zero;
        }, IntPtr.Zero);
        return result;
    }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr FindWindow(string? className, string? windowName);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string? className, string? windowTitle);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetParent(IntPtr child, IntPtr newParent);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool GetWindowRect(IntPtr hWnd, out Rect rectangle);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int index, IntPtr value);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
