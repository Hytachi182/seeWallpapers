using System.Windows;
using System.Windows.Controls;
using SeeWallpaper.Engine;

namespace SeeWallpaper.App;

public sealed class PerformanceSettingsWindow : Window
{
    private readonly ComboBox _profile;

    private readonly CheckBox _pauseFullscreen;
    private readonly CheckBox _pauseBattery;

    public PerformanceSettingsWindow(WallpaperPerformanceProfile selectedProfile, bool pauseOnFullscreen, bool pauseOnBattery)
    {
        Title = "Performance settings";
        Icon = Application.Current.TryFindResource("BrandIcon") as System.Windows.Media.ImageSource;
        Width = 360;
        Height = 295;
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        StackPanel panel = new() { Margin = new Thickness(22) };
        panel.Children.Add(new TextBlock { Text = "Performance", FontSize = 22, FontWeight = FontWeights.SemiBold });
        panel.Children.Add(new TextBlock { Text = "Eco targets 20 FPS, Balanced 30 FPS, and High 60 FPS for templates that use the seeWallpaper SDK.", TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 6, 0, 14) });
        _profile = new ComboBox { ItemsSource = Enum.GetValues<WallpaperPerformanceProfile>(), SelectedItem = selectedProfile, Margin = new Thickness(0, 0, 0, 16) };
        panel.Children.Add(_profile);
        _pauseFullscreen = new CheckBox { Content = "Pause when a fullscreen app is active", IsChecked = pauseOnFullscreen, Margin = new Thickness(0, 0, 0, 8) };
        _pauseBattery = new CheckBox { Content = "Pause on battery", IsChecked = pauseOnBattery, Margin = new Thickness(0, 0, 0, 16) };
        panel.Children.Add(_pauseFullscreen);
        panel.Children.Add(_pauseBattery);
        Button save = new() { Content = "Save", HorizontalAlignment = HorizontalAlignment.Right, Padding = new Thickness(18, 8, 18, 8) };
        save.Click += (_, _) => DialogResult = true;
        panel.Children.Add(save);
        Content = panel;
    }

    public WallpaperPerformanceProfile SelectedProfile => _profile.SelectedItem is WallpaperPerformanceProfile profile ? profile : WallpaperPerformanceProfile.Balanced;
    public bool PauseOnFullscreen => _pauseFullscreen.IsChecked == true;
    public bool PauseOnBattery => _pauseBattery.IsChecked == true;
}
