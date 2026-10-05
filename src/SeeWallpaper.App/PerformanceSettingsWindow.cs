using System.Windows;
using System.Windows.Controls;
using SeeWallpaper.Engine;

namespace SeeWallpaper.App;

public sealed class PerformanceSettingsWindow : Window
{
    private readonly ComboBox _profile;

    private readonly CheckBox _pauseFullscreen;
    private readonly CheckBox _pauseBattery;
    private readonly CheckBox _startWithWindows;

    public PerformanceSettingsWindow(WallpaperPerformanceProfile selectedProfile, bool pauseOnFullscreen, bool pauseOnBattery, bool startWithWindows)
    {
        Title = Localization.T("PerformanceSettings");
        Background = (System.Windows.Media.Brush)Application.Current.FindResource("Canvas");
        Foreground = System.Windows.Media.Brushes.White;
        Icon = Application.Current.TryFindResource("BrandIcon") as System.Windows.Media.ImageSource;
        Width = 440;
        SizeToContent = SizeToContent.Height;
        MaxHeight = Math.Max(320, SystemParameters.WorkArea.Height - 80);
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        StackPanel panel = new() { Margin = new Thickness(22) };
        panel.Children.Add(new TextBlock { Text = Localization.T("Performance"), FontSize = 22, FontWeight = FontWeights.SemiBold });
        panel.Children.Add(new TextBlock { Text = Localization.T("EcoTargetsFPSBalancedFPSAndHighFPSForTemplatesThatUseTheSeeWallpaperSDK"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 6, 0, 14) });
        _profile = new ComboBox { SelectedValuePath = "Tag", Margin = new Thickness(0, 0, 0, 16) };
        foreach (WallpaperPerformanceProfile profile in Enum.GetValues<WallpaperPerformanceProfile>())
            _profile.Items.Add(new ComboBoxItem { Content = Localization.T(profile.ToString()), Tag = profile });
        _profile.SelectedValue = selectedProfile;
        panel.Children.Add(_profile);
        _pauseFullscreen = new CheckBox { Content = WrappedText("PauseWhenAFullscreenAppIsActive"), IsChecked = pauseOnFullscreen, Margin = new Thickness(0, 0, 0, 8) };
        _pauseBattery = new CheckBox { Content = WrappedText("PauseOnBattery"), IsChecked = pauseOnBattery, Margin = new Thickness(0, 0, 0, 16) };
        panel.Children.Add(_pauseFullscreen);
        panel.Children.Add(_pauseBattery);
        panel.Children.Add(new TextBlock { Text = Localization.T("Startup"), FontSize = 16, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 0, 0, 8) });
        _startWithWindows = new CheckBox { Content = WrappedText("StartWithWindowsAndRestoreMyWallpapers"), IsChecked = startWithWindows, Margin = new Thickness(0, 0, 0, 16) };
        panel.Children.Add(_startWithWindows);
        Button save = new() { Content = Localization.T("Save"), HorizontalAlignment = HorizontalAlignment.Right, Padding = new Thickness(18, 8, 18, 8) };
        save.Click += (_, _) => DialogResult = true;
        panel.Children.Add(save);
        Content = new ScrollViewer { Content = panel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
    }

    private static TextBlock WrappedText(string key) => new() { Text = Localization.T(key), TextWrapping = TextWrapping.Wrap, Foreground = System.Windows.Media.Brushes.White };
    public WallpaperPerformanceProfile SelectedProfile => _profile.SelectedValue is WallpaperPerformanceProfile profile ? profile : WallpaperPerformanceProfile.Balanced;
    public bool PauseOnFullscreen => _pauseFullscreen.IsChecked == true;
    public bool PauseOnBattery => _pauseBattery.IsChecked == true;
    public bool StartWithWindows => _startWithWindows.IsChecked == true;
}
