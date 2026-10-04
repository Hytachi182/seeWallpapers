using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using SeeWallpaper.Platform;

namespace SeeWallpaper.App;

public enum WallpaperApplicationMode { SingleDisplay, Clone, Span }

public sealed class ApplyModeWindow : Window
{
    private readonly List<(DisplayInfo Display, CheckBox Choice)> _choices = [];
    private readonly ComboBox _modeSelector;

    public ApplyModeWindow(IReadOnlyList<DisplayCardViewModel> displays, string sceneName, Action identify)
    {
        Title = $"Apply {sceneName}";
        Icon = Application.Current.TryFindResource("BrandIcon") as ImageSource;
        Width = 600; Height = 650; MinHeight = 480;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Background = (Brush)Application.Current.FindResource("Canvas");
        Foreground = Brushes.White;
        DockPanel panel = new() { Margin = new Thickness(24), Background = Background };
        StackPanel heading = new();
        heading.Children.Add(new TextBlock { Text = sceneName, FontSize = 24, FontWeight = FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap });
        heading.Children.Add(new TextBlock { Text = "Select the displays for this wallpaper.", Margin = new Thickness(0, 8, 0, 16), TextWrapping = TextWrapping.Wrap });
        Button identifyButton = new() { Content = "Identify displays", HorizontalAlignment = HorizontalAlignment.Left };
        identifyButton.Click += (_, _) => identify();
        heading.Children.Add(identifyButton);
        DockPanel.SetDock(heading, Dock.Top);
        panel.Children.Add(heading);

        StackPanel footer = new();
        Expander advanced = new() { Header = "Options for all displays", Margin = new Thickness(0, 12, 0, 12), Foreground = Brushes.White };
        StackPanel options = new();
        _modeSelector = new ComboBox { SelectedValuePath = "Tag", SelectedIndex = 0, Margin = new Thickness(0, 8, 0, 8) };
        _modeSelector.Items.Add(new ComboBoxItem { Content = "Selected displays", Tag = WallpaperApplicationMode.SingleDisplay });
        _modeSelector.Items.Add(new ComboBoxItem { Content = "Duplicate across all displays", Tag = WallpaperApplicationMode.Clone });
        _modeSelector.Items.Add(new ComboBoxItem { Content = "Span across all displays", Tag = WallpaperApplicationMode.Span });
        options.Children.Add(_modeSelector);
        TextBlock consequence = new() { TextWrapping = TextWrapping.Wrap };
        options.Children.Add(consequence);
        advanced.Content = options;
        footer.Children.Add(advanced);
        StackPanel actions = new() { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        Button cancel = new() { Content = "Cancel", IsCancel = true, Margin = new Thickness(0, 0, 8, 0) };
        Button apply = new() { Content = "Apply", IsDefault = true, Background = (Brush)Application.Current.FindResource("Accent") };
        apply.Click += (_, _) => DialogResult = true;
        actions.Children.Add(cancel); actions.Children.Add(apply);
        footer.Children.Add(actions);
        DockPanel.SetDock(footer, Dock.Bottom); panel.Children.Add(footer);

        StackPanel screenList = new();
        foreach (DisplayCardViewModel display in displays)
        {
            StackPanel label = new();
            label.Children.Add(new TextBlock { Text = display.Title, FontSize = 18, FontWeight = FontWeights.SemiBold });
            label.Children.Add(new TextBlock { Text = display.Details, Margin = new Thickness(0, 4, 0, 4) });
            label.Children.Add(new TextBlock { Text = display.CurrentScene, TextWrapping = TextWrapping.Wrap });
            CheckBox choice = new() { Content = label, Foreground = Brushes.White, Padding = new Thickness(12), Margin = new Thickness(0, 0, 0, 12), IsChecked = display.Display.IsPrimary };
            choice.Checked += (_, _) => UpdateAction();
            choice.Unchecked += (_, _) => UpdateAction();
            _choices.Add((display.Display, choice)); screenList.Children.Add(choice);
        }
        _modeSelector.SelectionChanged += (_, _) => UpdateAction();
        panel.Children.Add(new ScrollViewer { Content = screenList, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
        Content = panel;
        UpdateAction();

        void UpdateAction()
        {
            bool local = SelectedMode == WallpaperApplicationMode.SingleDisplay;
            foreach ((_, CheckBox choice) in _choices) choice.IsEnabled = local;
            apply.IsEnabled = displays.Count > 0 && (!local || SelectedDisplays.Count > 0);
            apply.Content = local ? $"Apply to {SelectedDisplays.Count} display(s)" : "Apply to all displays";
            consequence.Text = local
                ? "Other displays keep their wallpaper. When leaving span mode, each receives the previous wallpaper."
                : "This replaces the wallpapers on all connected displays.";
        }
    }

    public IReadOnlyList<DisplayInfo> SelectedDisplays => _choices.Where(item => item.Choice.IsChecked == true).Select(item => item.Display).ToArray();
    public WallpaperApplicationMode SelectedMode => _modeSelector.SelectedValue is WallpaperApplicationMode mode ? mode : WallpaperApplicationMode.SingleDisplay;
}
