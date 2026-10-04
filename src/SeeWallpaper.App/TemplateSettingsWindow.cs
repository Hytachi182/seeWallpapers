using System.Globalization;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using SeeWallpaper.Core;
using SeeWallpaper.Engine;
using SeeWallpaper.Infrastructure;

namespace SeeWallpaper.App;

public sealed class TemplateSettingsWindow : Window
{
    private readonly InstalledTemplate _template;
    private readonly WebWallpaperWindow _preview;
    private readonly TemplateSettingsStore _settingsStore;
    private readonly Dictionary<string, object?> _settings;

    public TemplateSettingsWindow(InstalledTemplate template, WebWallpaperWindow preview, TemplateSettingsStore settingsStore, IReadOnlyDictionary<string, object?> settings)
    {
        _template = template;
        Icon = Application.Current.TryFindResource("BrandIcon") as System.Windows.Media.ImageSource;
        _preview = preview;
        _settingsStore = settingsStore;
        _settings = new Dictionary<string, object?>(settings);
        Title = $"Customize — {template.Manifest.Name}";
        Width = 350;
        Height = 520;
        MinHeight = 320;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = preview;

        StackPanel panel = new() { Margin = new Thickness(22) };
        panel.Children.Add(new TextBlock { Text = "Customize", FontSize = 24, FontWeight = FontWeights.SemiBold });
        panel.Children.Add(new TextBlock { Text = "Changes are saved locally and applied immediately to the preview.", TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 6, 0, 18) });
        ScrollViewer scroll = new() { Content = panel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        Content = scroll;
        foreach (TemplateSetting setting in template.Manifest.Settings) AddSetting(panel, setting);
    }

    private void AddSetting(Panel panel, TemplateSetting setting)
    {
        panel.Children.Add(new TextBlock { Text = setting.Label, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 0, 0, 5) });
        FrameworkElement control = setting.Type switch
        {
            "boolean" => CreateBoolean(setting),
            "slider" => CreateSlider(setting),
            "select" => CreateSelect(setting),
            _ => CreateText(setting)
        };
        panel.Children.Add(control);
        panel.Children.Add(new Separator { Margin = new Thickness(0, 13, 0, 13) });
    }

    private CheckBox CreateBoolean(TemplateSetting setting)
    {
        CheckBox control = new() { IsChecked = ReadBoolean(setting.Id, setting.Default) };
        control.Checked += (_, _) => Update(setting.Id, true);
        control.Unchecked += (_, _) => Update(setting.Id, false);
        return control;
    }

    private Slider CreateSlider(TemplateSetting setting)
    {
        Slider control = new() { Minimum = setting.Min ?? 0, Maximum = setting.Max ?? 100, TickFrequency = setting.Step ?? 1, SmallChange = setting.Step ?? 1, LargeChange = setting.Step ?? 1, Value = ReadNumber(setting.Id, setting.Default) };
        control.ValueChanged += (_, _) => Update(setting.Id, Math.Round(control.Value, 4));
        return control;
    }

    private ComboBox CreateSelect(TemplateSetting setting)
    {
        ComboBox control = new() { ItemsSource = setting.Options ?? Array.Empty<string>(), SelectedItem = ReadText(setting.Id, setting.Default) };
        control.SelectionChanged += (_, _) => { if (control.SelectedItem is string value) Update(setting.Id, value); };
        return control;
    }

    private TextBox CreateText(TemplateSetting setting)
    {
        TextBox control = new() { Text = ReadText(setting.Id, setting.Default) };
        control.TextChanged += (_, _) => Update(setting.Id, control.Text);
        return control;
    }

    private async void Update(string id, object? value)
    {
        _settings[id] = value;
        try
        {
            await _preview.UpdateSettingsAsync(_settings);
            await _settingsStore.SaveAsync(_template.Manifest.Id, _settings);
        }
        catch (Exception exception)
        {
            MessageBox.Show(exception.Message, "Settings could not be saved", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private bool ReadBoolean(string id, object? fallback) => ReadValue(id, fallback) switch { JsonElement { ValueKind: JsonValueKind.True } => true, JsonElement { ValueKind: JsonValueKind.False } => false, bool value => value, _ => false };
    private double ReadNumber(string id, object? fallback) => ReadValue(id, fallback) switch { JsonElement element when element.TryGetDouble(out double value) => value, double value => value, int value => value, _ => 0 };
    private string ReadText(string id, object? fallback) => ReadValue(id, fallback) switch { JsonElement element when element.ValueKind == JsonValueKind.String => element.GetString() ?? string.Empty, null => string.Empty, object value => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty };
    private object? ReadValue(string id, object? fallback) => _settings.TryGetValue(id, out object? value) ? value : fallback;
}
