using System.Runtime.InteropServices;
using SeeWallpaper.Engine;
using SeeWallpaper.Engine.Windows;
using SeeWallpaper.Platform;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class DesktopSurfaceIntegrationTests
{
    [DesktopIntegrationFact]
    public void Existing_windows_shell_accepts_a_hidden_wallpaper_at_each_monitor_bounds()
    {
        Exception? failure = null;
        Thread thread = new(() =>
        {
            try
            {
                IntPtr host = DesktopSurface.GetWallpaperHost();
                Assert.NotEqual(IntPtr.Zero, host);
                IReadOnlyList<DisplayInfo> displays = new WindowsDisplayManager().GetDisplays();
                Assert.NotEmpty(displays);
                foreach (DisplayInfo display in displays)
                {
                    IntPtr window = CreateWindowEx(0, "STATIC", "seeWallpaper attachment verification", 0x80000000, 0, 0, 10, 10, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
                    Assert.NotEqual(IntPtr.Zero, window);
                    try
                    {
                        DesktopSurface.AttachBehindDesktopIcons(window, new WallpaperBounds(display.X, display.Y, display.Width, display.Height), showWindow: false);
                        using DisplayDpiContext dpi = DisplayDpiContext.PhysicalPixels();
                        Assert.Equal(host, GetParent(window));
                        Assert.True(GetWindowRect(window, out NativeRect rectangle));
                        Assert.Equal(display.X, rectangle.Left);
                        Assert.Equal(display.Y, rectangle.Top);
                        Assert.Equal(display.Width, rectangle.Right - rectangle.Left);
                        Assert.Equal(display.Height, rectangle.Bottom - rectangle.Top);
                        Assert.False(IsWindowVisible(window));
                    }
                    finally { DestroyWindow(window); }
                }
            }
            catch (Exception exception) { failure = exception; }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(20)), "Native desktop attachment verification timed out.");
        if (failure is not null) System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(failure).Throw();
    }

    private sealed class DesktopIntegrationFactAttribute : FactAttribute
    {
        public DesktopIntegrationFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("SEEWALLPAPER_DESKTOP_TEST") != "1")
                Skip = "Opt-in desktop integration check: set SEEWALLPAPER_DESKTOP_TEST=1 on an interactive Windows workstation.";
        }
    }
    [StructLayout(LayoutKind.Sequential)] private struct NativeRect { public int Left; public int Top; public int Right; public int Bottom; }
    [DllImport("user32.dll")] private static extern IntPtr GetParent(IntPtr child);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out NativeRect rectangle);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern IntPtr CreateWindowEx(uint extendedStyle, string className, string title, uint style, int x, int y, int width, int height, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool DestroyWindow(IntPtr window);
}
