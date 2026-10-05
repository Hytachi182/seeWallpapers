using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;
using SeeWallpaper.Platform;

namespace SeeWallpaper.App;

internal sealed class DisplayIdentificationWindow : Window
{
    public DisplayIdentificationWindow(DisplayInfo display, int number)
    {
        WindowStyle = WindowStyle.None;
        ResizeMode = ResizeMode.NoResize;
        ShowInTaskbar = false;
        ShowActivated = false;
        Topmost = true;
        Width = 240;
        Height = 150;
        Background = new SolidColorBrush(Color.FromRgb(24, 27, 38));
        Content = new TextBlock { Text = Localization.F("DisplayFormat", number), FontSize = 40, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        DispatcherTimer timer = new() { Interval = TimeSpan.FromSeconds(3) };
        timer.Tick += (_, _) => Close();
        Loaded += (_, _) =>
        {
            SetWindowPos(new WindowInteropHelper(this).Handle, new IntPtr(-1), display.X + (display.Width - 240) / 2, display.Y + (display.Height - 150) / 2, 240, 150, 0x0010);
            timer.Start();
        };
        Closed += (_, _) => timer.Stop();
    }

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowPos(IntPtr window, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
}
