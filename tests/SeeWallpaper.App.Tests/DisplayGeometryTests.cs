using System.Runtime.InteropServices;
using SeeWallpaper.Engine;
using SeeWallpaper.Platform;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class DisplayGeometryTests
{
    [Fact]
    public void Three_full_hd_monitors_keep_separate_physical_rectangles_and_one_correct_span()
    {
        DisplayInfo[] displays = [
            new("left", "left", false, 1920, 1080, -1920, 0),
            new("main", "main", true, 1920, 1080, 0, 0),
            new("right", "right", false, 1920, 1080, 1920, 0)];
        Assert.Equal(new WallpaperBounds(-1920, 0, 1920, 1080), WallpaperBounds.FromDisplay(displays[0]));
        Assert.Equal(new WallpaperBounds(0, 0, 1920, 1080), WallpaperBounds.FromDisplay(displays[1]));
        Assert.Equal(new WallpaperBounds(1920, 0, 1920, 1080), WallpaperBounds.FromDisplay(displays[2]));
        Assert.Equal(new WallpaperBounds(-1920, 0, 5760, 1080), WallpaperBounds.Span(displays));
    }

    [Fact]
    public void Span_includes_negative_and_vertically_offset_monitors_without_rescaling()
    {
        DisplayInfo[] displays = [new("a", "a", true, 1920, 1080), new("b", "b", false, 1920, 1080, -1920, -1080), new("c", "c", false, 1080, 1920, 1920, -240)];
        Assert.Equal(new WallpaperBounds(-1920, -1080, 4920, 2760), WallpaperBounds.Span(displays));
        Assert.Throws<InvalidOperationException>(() => WallpaperBounds.Span([]));
    }

    [Fact]
    public void Native_detection_matches_current_display_modes_and_is_independent_of_caller_dpi()
    {
        WindowsDisplayManager manager = new();
        DisplayInfo[] expected = manager.GetDisplays().OrderBy(display => display.Id).ToArray();
        Assert.NotEmpty(expected);
        foreach (DisplayInfo display in expected)
        {
            DeviceMode mode = new() { Size = 220 };
            Assert.True(EnumDisplaySettingsEx(display.Id, -1, ref mode, 0));
            Assert.Equal((int)mode.Width, display.Width);
            Assert.Equal((int)mode.Height, display.Height);
            Assert.Equal(mode.X, display.X);
            Assert.Equal(mode.Y, display.Y);
        }
        foreach (int awareness in new[] { -1, -2, -3, -4 })
        {
            IntPtr previous = SetThreadDpiAwarenessContext(new IntPtr(awareness));
            Assert.NotEqual(IntPtr.Zero, previous);
            try
            {
                Assert.Equal(expected, manager.GetDisplays().OrderBy(display => display.Id).ToArray());
                Assert.True(AreDpiAwarenessContextsEqual(new IntPtr(awareness), GetThreadDpiAwarenessContext()), "Display detection must restore the caller DPI context");
            }
            finally { SetThreadDpiAwarenessContext(previous); }
        }
    }

    [StructLayout(LayoutKind.Explicit, Size = 220)]
    private struct DeviceMode
    {
        [FieldOffset(68)] public ushort Size;
        [FieldOffset(76)] public int X;
        [FieldOffset(80)] public int Y;
        [FieldOffset(172)] public uint Width;
        [FieldOffset(176)] public uint Height;
    }
    [DllImport("user32.dll", EntryPoint = "EnumDisplaySettingsExW", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplaySettingsEx(string device, int mode, ref DeviceMode settings, uint flags);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] private static extern IntPtr GetThreadDpiAwarenessContext();
    [DllImport("user32.dll")] private static extern bool AreDpiAwarenessContextsEqual(IntPtr first, IntPtr second);
}
