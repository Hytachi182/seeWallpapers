using System.Runtime.InteropServices;
using System.Text;

namespace SeeWallpaper.Engine.Windows;

internal readonly record struct ScreenRect(int Left, int Top, int Right, int Bottom)
{
    internal bool IsEmpty => Right <= Left || Bottom <= Top;
    internal ScreenRect Intersect(ScreenRect other) => new(Math.Max(Left, other.Left), Math.Max(Top, other.Top), Math.Min(Right, other.Right), Math.Min(Bottom, other.Bottom));
}

internal sealed record DesktopMonitor(ScreenRect Bounds, ScreenRect WorkArea);

// Decides whether a desktop wallpaper is fully hidden by opaque application windows.
// Every uncertain case counts as visible: a false "hidden" would freeze a scene the user can see.
internal static class DesktopOcclusion
{
    private const int GwlExStyle = -20;
    private const long WsExTransparent = 0x00000020;
    private const long WsExToolWindow = 0x00000080;
    private const long WsExLayered = 0x00080000;
    private const uint LwaColorKey = 0x1;
    private const uint LwaAlpha = 0x2;
    private const int DwmwaExtendedFrameBounds = 9;
    private const int DwmwaCloaked = 14;
    private const int DwmwaSystemBackdropType = 38;
    private const int DwmsbtTransientWindow = 3; // Acrylic blurs live content behind the window.
    private static readonly IntPtr PerMonitorAwareV2 = new(-4);

    // Shell surfaces that are either the desktop itself or overlays which show the wallpaper.
    private static readonly HashSet<string> IgnoredClasses = new(StringComparer.Ordinal)
    {
        "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd", "Windows.UI.Core.CoreWindow",
        "XamlExplorerHostIslandWindow", "MultitaskingViewFrame", "ForegroundStaging"
    };
    private static readonly HashSet<string> DesktopRevealingForegroundClasses = new(StringComparer.Ordinal)
    {
        "XamlExplorerHostIslandWindow", "MultitaskingViewFrame", "ForegroundStaging"
    };

    internal static bool IsWallpaperHidden(ScreenRect wallpaper, IReadOnlyList<DesktopMonitor> monitors, IReadOnlyList<ScreenRect> covers)
    {
        bool onAnyMonitor = false;
        foreach (DesktopMonitor monitor in monitors)
        {
            if (wallpaper.Intersect(monitor.Bounds).IsEmpty) continue;
            onAnyMonitor = true;
            // The taskbar strip outside the work area is opaque shell chrome.
            ScreenRect visible = wallpaper.Intersect(monitor.WorkArea);
            if (!visible.IsEmpty && !IsAreaCovered(visible, covers)) return false;
        }
        return onAnyMonitor;
    }

    internal static bool IsAreaCovered(ScreenRect area, IReadOnlyList<ScreenRect> covers)
    {
        List<ScreenRect> relevant = covers.Select(cover => cover.Intersect(area)).Where(cover => !cover.IsEmpty).ToList();
        if (relevant.Count == 0) return false;
        // Split the area along every window edge; each cell is either fully inside a window or not.
        int[] xs = relevant.SelectMany(cover => new[] { cover.Left, cover.Right }).Append(area.Left).Append(area.Right).Distinct().Order().ToArray();
        int[] ys = relevant.SelectMany(cover => new[] { cover.Top, cover.Bottom }).Append(area.Top).Append(area.Bottom).Distinct().Order().ToArray();
        for (int x = 0; x < xs.Length - 1; x++)
            for (int y = 0; y < ys.Length - 1; y++)
            {
                int cellX = xs[x], cellY = ys[y];
                if (!relevant.Any(cover => cover.Left <= cellX && cellX < cover.Right && cover.Top <= cellY && cellY < cover.Bottom)) return false;
            }
        return true;
    }

    /// <summary>Reads monitors and opaque top-level windows in physical pixels, or null when the desktop is being revealed.</summary>
    internal static (IReadOnlyList<DesktopMonitor> Monitors, IReadOnlyList<ScreenRect> Covers)? CaptureDesktop()
    {
        IntPtr previous = SetThreadDpiAwarenessContext(PerMonitorAwareV2);
        try
        {
            // Task View and similar overlays draw the wallpaper while application windows stay "visible".
            if (DesktopRevealingForegroundClasses.Contains(GetClassName(GetForegroundWindow()))) return null;
            List<DesktopMonitor> monitors = [];
            EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, (monitor, _, _, _) =>
            {
                MonitorInfo info = new() { Size = (uint)Marshal.SizeOf<MonitorInfo>() };
                if (GetMonitorInfo(monitor, ref info)) monitors.Add(new DesktopMonitor(info.Monitor.ToScreenRect(), info.Work.ToScreenRect()));
                return true;
            }, IntPtr.Zero);
            List<ScreenRect> covers = [];
            EnumWindows((window, _) =>
            {
                if (TryGetOpaqueBounds(window, out ScreenRect bounds)) covers.Add(bounds);
                return true;
            }, IntPtr.Zero);
            return (monitors, covers);
        }
        finally
        {
            if (previous != IntPtr.Zero) SetThreadDpiAwarenessContext(previous);
        }
    }

    internal static bool TryGetWindowBounds(IntPtr window, out ScreenRect bounds)
    {
        IntPtr previous = SetThreadDpiAwarenessContext(PerMonitorAwareV2);
        try
        {
            bool success = GetWindowRect(window, out Rect rect);
            bounds = rect.ToScreenRect();
            return success && !bounds.IsEmpty;
        }
        finally
        {
            if (previous != IntPtr.Zero) SetThreadDpiAwarenessContext(previous);
        }
    }

    private static bool TryGetOpaqueBounds(IntPtr window, out ScreenRect bounds)
    {
        bounds = default;
        if (!IsWindowVisible(window) || IsIconic(window)) return false;
        if (DwmGetWindowAttribute(window, DwmwaCloaked, out int cloaked, sizeof(int)) == 0 && cloaked != 0) return false;
        long exStyle = GetWindowLongPtr(window, GwlExStyle).ToInt64();
        if ((exStyle & (WsExTransparent | WsExToolWindow)) != 0) return false;
        if ((exStyle & WsExLayered) != 0)
        {
            // Per-pixel layered windows cannot be proven opaque.
            if (!GetLayeredWindowAttributes(window, out _, out byte alpha, out uint flags)) return false;
            if ((flags & LwaColorKey) != 0 || ((flags & LwaAlpha) != 0 && alpha < 255)) return false;
        }
        if (DwmGetWindowAttribute(window, DwmwaSystemBackdropType, out int backdrop, sizeof(int)) == 0 && backdrop == DwmsbtTransientWindow) return false;
        if (IgnoredClasses.Contains(GetClassName(window))) return false;
        // Extended frame bounds exclude the invisible resize borders around modern windows.
        if (DwmGetWindowAttribute(window, DwmwaExtendedFrameBounds, out Rect rect, Marshal.SizeOf<Rect>()) != 0) return false;
        bounds = rect.ToScreenRect();
        return !bounds.IsEmpty;
    }

    private static string GetClassName(IntPtr window)
    {
        if (window == IntPtr.Zero) return string.Empty;
        StringBuilder name = new(256);
        return GetClassName(window, name, name.Capacity) > 0 ? name.ToString() : string.Empty;
    }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    private delegate bool MonitorEnumProc(IntPtr monitor, IntPtr hdc, IntPtr rect, IntPtr data);
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left; public int Top; public int Right; public int Bottom; public readonly ScreenRect ToScreenRect() => new(Left, Top, Right, Bottom); }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public uint Size; public Rect Monitor; public Rect Work; public uint Flags; }
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll")] private static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorEnumProc callback, IntPtr data);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out Rect rectangle);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
    [DllImport("user32.dll")] private static extern bool GetLayeredWindowAttributes(IntPtr hWnd, out uint colorKey, out byte alpha, out uint flags);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr hWnd, int attribute, out int value, int size);
    [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr hWnd, int attribute, out Rect value, int size);
}
