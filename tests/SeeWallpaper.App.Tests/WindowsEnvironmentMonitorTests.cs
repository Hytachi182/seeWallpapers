using SeeWallpaper.Platform;
using Xunit;
using Rect = SeeWallpaper.Platform.WindowsEnvironmentMonitor.Rect;

namespace SeeWallpaper.App.Tests;

public sealed class WindowsEnvironmentMonitorTests
{
    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public void Initial_environment_state_is_available_before_any_wallpaper_is_restored(bool fullscreen, bool battery)
    {
        WindowsEnvironmentState expected = new(fullscreen, battery);
        int reads = 0;
        using WindowsEnvironmentMonitor monitor = new(() => { reads++; return expected; }, TimeSpan.FromHours(1));
        Assert.Equal(0, reads);
        Assert.Equal(expected, monitor.Start());
        Assert.Equal(1, reads);
    }

    [Fact]
    public async Task Subsequent_environment_changes_are_delivered_after_start()
    {
        WindowsEnvironmentState state = new(true, true);
        using WindowsEnvironmentMonitor monitor = new(() => Volatile.Read(ref state), TimeSpan.FromMilliseconds(10));
        TaskCompletionSource<WindowsEnvironmentState> changed = new(TaskCreationOptions.RunContinuationsAsynchronously);
        monitor.StateChanged += (_, value) => changed.TrySetResult(value);
        Assert.Equal(state, monitor.Start());
        WindowsEnvironmentState resumed = new(false, false);
        Volatile.Write(ref state, resumed);
        Assert.Equal(resumed, await changed.Task.WaitAsync(TimeSpan.FromSeconds(5)));
    }

    private static readonly Rect Primary = Bounds(0, 0, 1920, 1080);
    private static readonly Rect Secondary = Bounds(-1920, -1080, 0, 0);

    [Theory]
    [InlineData("Progman")]
    [InlineData("WorkerW")]
    [InlineData("SHELLDLL_DefView")]
    [InlineData("SysListView32")]
    [InlineData("Shell_TrayWnd")]
    [InlineData("Shell_SecondaryTrayWnd")]
    public void Desktop_and_shell_surfaces_never_trigger_fullscreen_pause(string windowClass)
    {
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow(windowClass, Primary, Primary));
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow(windowClass, Secondary, Secondary));
    }

    [Theory]
    [InlineData("Chrome_WidgetWin_1")]
    [InlineData("ApplicationFrameWindow")]
    [InlineData("CabinetWClass")]
    public void Fullscreen_applications_still_trigger_pause(string windowClass)
    {
        Assert.True(WindowsEnvironmentMonitor.IsFullscreenWindow(windowClass, Primary, Primary));
        Assert.True(WindowsEnvironmentMonitor.IsFullscreenWindow(windowClass, Secondary, Secondary));
    }

    [Fact]
    public void Windowed_and_maximized_applications_do_not_trigger_fullscreen_pause()
    {
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow("Chrome_WidgetWin_1", Bounds(100, 100, 1500, 900), Primary));
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow("CabinetWClass", Bounds(0, 0, 1920, 1040), Primary));
    }

    [Fact]
    public void Two_pixel_fullscreen_tolerance_is_preserved()
    {
        Assert.True(WindowsEnvironmentMonitor.IsFullscreenWindow("Chrome_WidgetWin_1", Bounds(-2, -2, 1922, 1082), Primary));
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow("Chrome_WidgetWin_1", Bounds(-3, 0, 1920, 1080), Primary));
    }

    [Fact]
    public void Unknown_class_or_empty_bounds_do_not_pause_visible_wallpapers()
    {
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow("", Primary, Primary));
        Assert.False(WindowsEnvironmentMonitor.IsFullscreenWindow("Chrome_WidgetWin_1", default, default));
    }

    private static Rect Bounds(int left, int top, int right, int bottom) => new() { Left = left, Top = top, Right = right, Bottom = bottom };
}
