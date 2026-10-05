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
    private bool _saving;
    private bool _saveAgain;
    private readonly Func<IReadOnlyDictionary<string, object?>, Task>? _applyToDesktop;

    public TemplateSettingsWindow(InstalledTemplate template, WebWallpaperWindow preview, TemplateSettingsStore settingsStore, IReadOnlyDictionary<string, object?> settings,
        Func<IReadOnlyDictionary<string, object?>, Task>? applyToDesktop = null)
    {
        _template = template;
        Background = (System.Windows.Media.Brush)Application.Current.FindResource("Canvas");
        Foreground = System.Windows.Media.Brushes.White;
        Icon = Application.Current.TryFindResource("BrandIcon") as System.Windows.Media.ImageSource;
        _preview = preview;
        _settingsStore = settingsStore;
        _settings = new Dictionary<string, object?>(settings);
        _applyToDesktop = applyToDesktop;
        Localization.Set(this, TitleProperty, () => Localization.F("CustomizeFormat", template.Manifest.Name));
        Width = 440;
        MinWidth = 360;
        Height = 720;
        MinHeight = 320;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        Owner = preview;

        StackPanel panel = new() { Margin = new Thickness(22) };
        TextBlock heading = new() { FontSize = 24, FontWeight = FontWeights.SemiBold };
        Localization.Set(heading, TextBlock.TextProperty, () => Localization.T("Customize"));
        panel.Children.Add(heading);
        TextBlock description = new() { TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 6, 0, 18) };
        Localization.Set(description, TextBlock.TextProperty, () => Localization.T("ChangesAreSavedLocallyAndAppliedImmediatelyToThePreview"));
        panel.Children.Add(description);
        ScrollViewer scroll = new() { Content = panel, VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
        Content = scroll;
        AddMetricsSettings(panel);
        AddHeading(panel, "SceneSettings");
        foreach (TemplateSetting setting in template.Manifest.Settings) AddSetting(panel, setting);
    }

    private static void AddHeading(Panel panel, string key)
    {
        TextBlock heading = new() { FontSize = 18, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 16, 0, 10) };
        Localization.Set(heading, TextBlock.TextProperty, () => Localization.T(key));
        panel.Children.Add(heading);
    }

    private void AddMetricsSettings(Panel panel)
    {
        AddHeading(panel, "SystemMetrics");
        TextBlock hint = new() { TextWrapping = TextWrapping.Wrap, Foreground = (System.Windows.Media.Brush)Application.Current.FindResource("Muted"), Margin = new Thickness(0, 0, 0, 12) };
        Localization.Set(hint, TextBlock.TextProperty, () => Localization.T("SystemMetricsHint"));
        panel.Children.Add(hint);
        CheckBox enabled = MetricToggle("Enabled", "ShowSystemMetrics", false);
        panel.Children.Add(enabled);
        StackPanel options = new() { Margin = new Thickness(0, 12, 0, 10), IsEnabled = enabled.IsChecked == true };
        enabled.Checked += (_, _) => options.IsEnabled = true;
        enabled.Unchecked += (_, _) => options.IsEnabled = false;
        panel.Children.Add(options);
        WrapPanel metrics = new();
        foreach ((string key, string label, bool initial) in new[] {
            ("Cpu", "MetricCpu", true), ("Ram", "MetricRam", true), ("Uptime", "MetricUptime", false),
            ("Power", "MetricPower", false), ("Hostname", "MetricHostname", false) })
            metrics.Children.Add(MetricToggle(key, label, initial));
        options.Children.Add(metrics);
        AddMetricChoice(options, "Position", "MetricsPosition", "bottom-right", [
            ("top-left", "MetricsTopLeft"), ("top-right", "MetricsTopRight"),
            ("bottom-left", "MetricsBottomLeft"), ("bottom-right", "MetricsBottomRight")]);
        AddMetricChoice(options, "Style", "MetricsStyle", "values", [
            ("values", "MetricsValues"), ("bars", "MetricsBars"), ("graphs", "MetricsGraphs")]);
        AddMetricChoice(options, "Color", "MetricsColor", "#58d5ff", [
            ("#58d5ff", "MetricsCyan"), ("#8b7cff", "MetricsViolet"), ("#70e1a1", "MetricsGreen"),
            ("#ffb454", "MetricsOrange"), ("#ff91b8", "MetricsPink"), ("#ffffff", "MetricsWhite")]);
        AddMetricSlider(options, "Size", "MetricsSize", 100, 70, 160, "%");
        AddMetricSlider(options, "Opacity", "MetricsOpacity", 85, 0, 100, "%");
        AddMetricSlider(options, "Margin", "MetricsMargin", 24, 8, 120, "px");
        panel.Children.Add(new Separator { Margin = new Thickness(0, 8, 0, 8) });
    }

    private CheckBox MetricToggle(string key, string label, bool initial)
    {
        string id = "__seeMetrics" + key;
        CheckBox control = new() { IsChecked = ReadBoolean(id, initial), Foreground = Foreground, Margin = new Thickness(0, 0, 18, 10) };
        Localization.Set(control, ContentControl.ContentProperty, () => Localization.T(label));
        control.Checked += (_, _) => Update(id, true);
        control.Unchecked += (_, _) => Update(id, false);
        return control;
    }

    private void AddMetricLabel(Panel panel, string label)
    {
        TextBlock text = new() { FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 10, 0, 5) };
        Localization.Set(text, TextBlock.TextProperty, () => Localization.T(label));
        panel.Children.Add(text);
    }

    private void AddMetricChoice(Panel panel, string key, string label, string initial, (string Value, string Label)[] choices)
    {
        string id = "__seeMetrics" + key;
        AddMetricLabel(panel, label);
        ComboBox control = new() { SelectedValuePath = "Tag", MinHeight = 30 };
        Localization.Set(control, System.Windows.Automation.AutomationProperties.NameProperty, () => Localization.T(label));
        foreach ((string value, string labelKey) in choices)
        {
            ComboBoxItem item = new() { Tag = value };
            Localization.Set(item, ContentControl.ContentProperty, () => Localization.T(labelKey));
            control.Items.Add(item);
        }
        string selected = ReadText(id, initial);
        control.SelectedValue = choices.Any(choice => choice.Value == selected) ? selected : initial;
        control.SelectionChanged += (_, _) => { if (control.SelectedValue is string value) Update(id, value); };
        panel.Children.Add(control);
    }

    private void AddMetricSlider(Panel panel, string key, string label, double initial, double minimum, double maximum, string unit)
    {
        string id = "__seeMetrics" + key;
        AddMetricLabel(panel, label);
        DockPanel row = new();
        TextBlock valueLabel = new() { Width = 64, TextAlignment = TextAlignment.Right, VerticalAlignment = VerticalAlignment.Center };
        DockPanel.SetDock(valueLabel, Dock.Right);
        row.Children.Add(valueLabel);
        double saved = ReadNumber(id, initial);
        Slider slider = new() { Minimum = minimum, Maximum = maximum, TickFrequency = 1, IsSnapToTickEnabled = true,
            Value = double.IsFinite(saved) ? Math.Clamp(saved, minimum, maximum) : initial, VerticalAlignment = VerticalAlignment.Center };
        Localization.Set(slider, System.Windows.Automation.AutomationProperties.NameProperty, () => Localization.T(label));
        valueLabel.Text = $"{slider.Value:0} {unit}";
        slider.ValueChanged += (_, _) => { valueLabel.Text = $"{slider.Value:0} {unit}"; Update(id, slider.Value); };
        row.Children.Add(slider);
        panel.Children.Add(row);
    }

    private void AddSetting(Panel panel, TemplateSetting setting)
    {
        TextBlock label = new() { FontWeight = FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 5) };
        Localization.Set(label, TextBlock.TextProperty, () => Localization.Metadata(setting.Label));
        panel.Children.Add(label);
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
        _settings["__seeMetricsLanguage"] = Localization.Current.Language;
        // Sliders can generate another change while the previous disk write is pending.
        _saveAgain = true;
        if (_saving) return;
        _saving = true;
        try
        {
            while (_saveAgain)
            {
                _saveAgain = false;
                Dictionary<string, object?> snapshot = new(_settings);
                await _preview.UpdateSettingsAsync(snapshot);
                await _settingsStore.SaveAsync(_template.Manifest.Id, snapshot);
                if (_applyToDesktop is not null) await _applyToDesktop(snapshot);
            }
        }
        catch (Exception exception)
        {
            MessageBox.Show(exception.Message, Localization.T("SettingsCouldNotBeSaved"), MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { _saving = false; }
    }

    private bool ReadBoolean(string id, object? fallback) => ReadValue(id, fallback) switch { JsonElement { ValueKind: JsonValueKind.True } => true, JsonElement { ValueKind: JsonValueKind.False } => false, bool value => value, _ => false };
    private double ReadNumber(string id, object? fallback) => ReadValue(id, fallback) switch { JsonElement element when element.TryGetDouble(out double value) => value, double value => value, int value => value, _ => 0 };
    private string ReadText(string id, object? fallback) => ReadValue(id, fallback) switch { JsonElement element when element.ValueKind == JsonValueKind.String => element.GetString() ?? string.Empty, null => string.Empty, object value => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty };
    private object? ReadValue(string id, object? fallback) => _settings.TryGetValue(id, out object? value) ? value : fallback;
}
