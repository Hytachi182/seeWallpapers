using System.Windows;
using System.Windows.Controls;
using SeeWallpaper.Platform;

namespace SeeWallpaper.App;

public enum WallpaperApplicationMode
{
    SingleDisplay,
    Clone,
    Span
}

public sealed class ApplyModeWindow : Window
{
    private readonly ComboBox _displaySelector;
    private readonly ComboBox _modeSelector;

    public ApplyModeWindow(IReadOnlyList<DisplayInfo> displays)
    {
        Title = "Apply wallpaper";
        Width = 360;
        Height = 260;
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        StackPanel panel = new() { Margin = new Thickness(22) };
        panel.Children.Add(new TextBlock { Text = "Apply wallpaper", FontSize = 22, FontWeight = FontWeights.SemiBold });
        panel.Children.Add(new TextBlock { Text = "Choose where this scene should run.", Margin = new Thickness(0, 6, 0, 18) });
        panel.Children.Add(new TextBlock { Text = "Display" });
        _displaySelector = new ComboBox { ItemsSource = displays, DisplayMemberPath = nameof(DisplayInfo.Name), SelectedItem = displays.FirstOrDefault(display => display.IsPrimary) ?? displays.FirstOrDefault(), Margin = new Thickness(0, 5, 0, 14) };
        panel.Children.Add(_displaySelector);
        panel.Children.Add(new TextBlock { Text = "Mode" });
        _modeSelector = new ComboBox { ItemsSource = Enum.GetValues<WallpaperApplicationMode>(), SelectedItem = WallpaperApplicationMode.SingleDisplay, Margin = new Thickness(0, 5, 0, 18) };
        _modeSelector.SelectionChanged += (_, _) => _displaySelector.IsEnabled = SelectedMode == WallpaperApplicationMode.SingleDisplay;
        panel.Children.Add(_modeSelector);
        Button apply = new() { Content = "Apply", HorizontalAlignment = HorizontalAlignment.Right, Padding = new Thickness(18, 8, 18, 8) };
        apply.Click += (_, _) => DialogResult = true;
        panel.Children.Add(apply);
        Content = panel;
    }

    public DisplayInfo? SelectedDisplay => _displaySelector.SelectedItem as DisplayInfo;
    public WallpaperApplicationMode SelectedMode => _modeSelector.SelectedItem is WallpaperApplicationMode mode ? mode : WallpaperApplicationMode.SingleDisplay;
}
