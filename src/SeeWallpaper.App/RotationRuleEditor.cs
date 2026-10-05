using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using SeeWallpaper.Infrastructure;

namespace SeeWallpaper.App;

/// <summary>Card that edits one rotation schedule; every change is reported immediately so it can be saved.</summary>
internal sealed class RotationRuleEditor : Border
{
    private static readonly (int Interval, RotationIntervalUnit Unit)[] Presets =
        [(15, RotationIntervalUnit.Minutes), (30, RotationIntervalUnit.Minutes), (1, RotationIntervalUnit.Hours), (2, RotationIntervalUnit.Hours), (6, RotationIntervalUnit.Hours), (1, RotationIntervalUnit.Days)];

    private readonly Action<WallpaperRotationRule> _changed;
    private readonly CheckBox _enabled;
    private readonly TextBox _interval;
    private readonly ComboBox _unit, _order, _source;
    private readonly CheckBox _align;
    private readonly StackPanel _body;
    private readonly Panel _customPanel;
    private readonly List<(string Id, CheckBox Choice)> _customChoices = [];
    private readonly TextBlock _status;
    private WallpaperRotationRule _rule;
    private bool _loading = true;

    public string Target => _rule.Target;

    public RotationRuleEditor(WallpaperRotationRule rule, string title, string details, IReadOnlyList<TemplateCardViewModel> templates,
        string? lockedReason, Action<WallpaperRotationRule> changed, Action next)
    {
        _rule = rule;
        _changed = changed;
        Background = (Brush)Application.Current.FindResource("Panel");
        CornerRadius = new CornerRadius(12);
        Padding = new Thickness(20);
        Margin = new Thickness(0, 0, 0, 16);
        Brush muted = (Brush)Application.Current.FindResource("Muted");
        StackPanel root = new();

        Grid header = new();
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        StackPanel heading = new();
        heading.Children.Add(new TextBlock { Text = title, FontSize = 20, FontWeight = FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap });
        heading.Children.Add(new TextBlock { Text = details, Foreground = muted, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 4, 0, 0) });
        header.Children.Add(heading);
        _enabled = new CheckBox { Content = Localization.T("RotationEnabled"), IsChecked = rule.Enabled, Foreground = Brushes.White, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(16, 0, 12, 0) };
        Grid.SetColumn(_enabled, 1);
        header.Children.Add(_enabled);
        Button nextButton = new() { Content = Localization.T("NextWallpaper"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0), ToolTip = Localization.T("ChangeNowAndRestartTheCountdown") };
        nextButton.Click += (_, _) => next();
        Grid.SetColumn(nextButton, 2);
        header.Children.Add(nextButton);
        root.Children.Add(header);

        _status = new TextBlock { Foreground = (Brush)Application.Current.FindResource("Accent"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 10, 0, 0) };
        root.Children.Add(_status);
        if (lockedReason is not null)
        {
            root.Children.Add(new TextBlock { Text = lockedReason, Foreground = muted, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 10, 0, 0) });
            _enabled.IsEnabled = false;
            nextButton.IsEnabled = false;
        }

        _body = new StackPanel { Margin = new Thickness(0, 16, 0, 0) };
        _body.Children.Add(Label(Localization.T("ChangeEvery")));
        StackPanel every = new() { Orientation = Orientation.Horizontal };
        _interval = new TextBox { Text = Math.Clamp(rule.Interval, 1, 9999).ToString(), Width = 64, MinHeight = 32, VerticalContentAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 8), MaxLength = 4 };
        AutomationProperties(_interval, Localization.T("ChangeEvery"));
        _unit = Choices([(Localization.T("Minutes"), RotationIntervalUnit.Minutes), (Localization.T("Hours"), RotationIntervalUnit.Hours), (Localization.T("Days"), RotationIntervalUnit.Days)], rule.Unit);
        _unit.Margin = new Thickness(0, 0, 0, 8);
        every.Children.Add(_interval);
        every.Children.Add(_unit);
        _body.Children.Add(every);
        WrapPanel presets = new() { Margin = new Thickness(0, 0, 0, 4) };
        foreach ((int interval, RotationIntervalUnit unit) in Presets)
        {
            Button preset = new() { Content = PresetLabel(interval, unit), Padding = new Thickness(10, 5, 10, 5), Margin = new Thickness(0, 0, 6, 6) };
            preset.Click += (_, _) => { _loading = true; _interval.Text = interval.ToString(); _unit.SelectedValue = unit; _loading = false; Emit(); };
            presets.Children.Add(preset);
        }
        _body.Children.Add(presets);
        _align = new CheckBox { Content = Localization.T("AlignOnTheClock"), IsChecked = rule.AlignToClock, Foreground = Brushes.White, Margin = new Thickness(0, 0, 0, 14), ToolTip = Localization.T("AlignOnTheClockHint") };
        _body.Children.Add(_align);

        Grid choices = new();
        choices.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        choices.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        StackPanel orderPanel = new() { Margin = new Thickness(0, 0, 12, 0) };
        orderPanel.Children.Add(Label(Localization.T("Order")));
        _order = Choices([(Localization.T("ShuffleNoRepeats"), RotationOrder.Shuffle), (Localization.T("InOrder"), RotationOrder.Sequential)], rule.Order);
        orderPanel.Children.Add(_order);
        StackPanel sourcePanel = new();
        sourcePanel.Children.Add(Label(Localization.T("WallpapersToRotate")));
        _source = Choices([(Localization.T("AllInstalledWallpapers"), RotationSource.AllInstalled), (Localization.T("MyFavorites"), RotationSource.Favorites), (Localization.T("MySelection"), RotationSource.Custom)], rule.Source);
        sourcePanel.Children.Add(_source);
        Grid.SetColumn(sourcePanel, 1);
        choices.Children.Add(orderPanel);
        choices.Children.Add(sourcePanel);
        _body.Children.Add(choices);

        StackPanel custom = new() { Margin = new Thickness(0, 14, 0, 0) };
        StackPanel bulk = new() { Orientation = Orientation.Horizontal };
        Button all = new() { Content = Localization.T("SelectAll"), Padding = new Thickness(10, 5, 10, 5), Margin = new Thickness(0, 0, 6, 8) };
        Button none = new() { Content = Localization.T("SelectNone"), Padding = new Thickness(10, 5, 10, 5), Margin = new Thickness(0, 0, 6, 8) };
        all.Click += (_, _) => SetAll(true);
        none.Click += (_, _) => SetAll(false);
        bulk.Children.Add(all);
        bulk.Children.Add(none);
        custom.Children.Add(bulk);
        WrapPanel list = new();
        // Selected wallpapers first, in rotation order, then the rest of the library.
        IEnumerable<TemplateCardViewModel> ordered = rule.TemplateIds
            .Select(id => templates.FirstOrDefault(item => string.Equals(item.Template.Manifest.Id, id, StringComparison.OrdinalIgnoreCase)))
            .OfType<TemplateCardViewModel>()
            .Concat(templates.Where(item => !rule.TemplateIds.Contains(item.Template.Manifest.Id, StringComparer.OrdinalIgnoreCase)));
        foreach (TemplateCardViewModel template in ordered)
        {
            CheckBox choice = new() { Content = template.Name, Foreground = Brushes.White, Width = 220, Margin = new Thickness(0, 0, 8, 6), IsChecked = rule.TemplateIds.Contains(template.Template.Manifest.Id, StringComparer.OrdinalIgnoreCase) };
            choice.Checked += (_, _) => Emit();
            choice.Unchecked += (_, _) => Emit();
            _customChoices.Add((template.Template.Manifest.Id, choice));
            list.Children.Add(choice);
        }
        custom.Children.Add(list);
        _customPanel = custom;
        _body.Children.Add(custom);
        root.Children.Add(_body);
        Child = root;

        _enabled.Checked += (_, _) => Emit();
        _enabled.Unchecked += (_, _) => Emit();
        _align.Checked += (_, _) => Emit();
        _align.Unchecked += (_, _) => Emit();
        _interval.TextChanged += (_, _) => Emit();
        _unit.SelectionChanged += (_, _) => Emit();
        _order.SelectionChanged += (_, _) => Emit();
        _source.SelectionChanged += (_, _) => Emit();
        UpdateVisibility();
        _loading = false;
        _body.IsEnabled = lockedReason is null;
    }

    public void SetStatus(string text) => _status.Text = text;

    private void Emit()
    {
        UpdateVisibility();
        if (_loading) return;
        bool valid = int.TryParse(_interval.Text, out int interval) && interval is >= 1 and <= 9999;
        _interval.BorderBrush = valid ? SystemColors.ControlDarkBrush : Brushes.IndianRed;
        if (!valid) return;
        _rule = _rule with
        {
            Enabled = _enabled.IsChecked == true,
            Interval = interval,
            Unit = (RotationIntervalUnit)_unit.SelectedValue,
            AlignToClock = _align.IsChecked == true,
            Order = (RotationOrder)_order.SelectedValue,
            Source = (RotationSource)_source.SelectedValue,
            TemplateIds = SelectedTemplates()
        };
        _changed(_rule);
    }

    private string[] SelectedTemplates()
    {
        string[] chosen = _customChoices.Where(item => item.Choice.IsChecked == true).Select(item => item.Id).ToArray();
        // Keep the existing order for already-selected wallpapers; new picks go to the end.
        return _rule.TemplateIds.Where(id => chosen.Contains(id, StringComparer.OrdinalIgnoreCase))
            .Concat(chosen.Where(id => !_rule.TemplateIds.Contains(id, StringComparer.OrdinalIgnoreCase))).ToArray();
    }

    private void SetAll(bool selected)
    {
        _loading = true;
        foreach ((_, CheckBox choice) in _customChoices) choice.IsChecked = selected;
        _loading = false;
        Emit();
    }

    private void UpdateVisibility()
    {
        if (_customPanel is null || _source is null) return;
        _customPanel.Visibility = _source.SelectedValue is RotationSource.Custom ? Visibility.Visible : Visibility.Collapsed;
        _body.Opacity = _enabled.IsChecked == true ? 1 : 0.55;
    }

    private static string PresetLabel(int interval, RotationIntervalUnit unit) => unit switch
    {
        RotationIntervalUnit.Minutes => Localization.F("MinutesShortFormat", interval),
        RotationIntervalUnit.Hours => Localization.F("HoursShortFormat", interval),
        _ => interval == 1 ? Localization.T("OneDay") : Localization.F("DaysShortFormat", interval)
    };

    private static ComboBox Choices<T>(IEnumerable<(string Label, T Value)> items, T selected)
    {
        ComboBox box = new() { SelectedValuePath = "Tag", MinHeight = 32, VerticalContentAlignment = VerticalAlignment.Center, MinWidth = 140 };
        foreach ((string label, T value) in items) box.Items.Add(new ComboBoxItem { Content = label, Tag = value });
        box.SelectedValue = selected;
        return box;
    }

    private static TextBlock Label(string text) => new() { Text = text, Margin = new Thickness(0, 0, 0, 6) };
    private static void AutomationProperties(UIElement element, string name) => System.Windows.Automation.AutomationProperties.SetName(element, name);
}
