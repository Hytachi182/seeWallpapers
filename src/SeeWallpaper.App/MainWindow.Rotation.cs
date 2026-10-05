using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using SeeWallpaper.Infrastructure;
using DisplayInfo = SeeWallpaper.Platform.DisplayInfo;

namespace SeeWallpaper.App;

/// <summary>Automatic wallpaper rotation: per display or synchronized across every display.</summary>
public partial class MainWindow
{
    private readonly WallpaperRotationService _rotation = new(new WallpaperRotationStore(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "seeWallpaper")));
    private readonly System.Windows.Threading.DispatcherTimer _rotationTimer = new() { Interval = TimeSpan.FromSeconds(15) };
    private readonly List<RotationRuleEditor> _rotationEditors = [];
    private bool _rotating;

    private bool IsPausedByEnvironment => _sessionLocked || (_pauseOnFullscreen && _environmentState.IsFullscreenApplicationActive) || (_pauseOnBattery && _environmentState.IsOnBattery);

    private async Task InitializeRotationAsync()
    {
        try { await _rotation.LoadAsync(DateTimeOffset.Now); }
        catch (Exception exception) { await _logger.ErrorAsync("Wallpaper rotation settings could not be loaded.", exception); }
        _rotationTimer.Tick += async (_, _) => await RunDueRotationsAsync();
        // The first tick runs once startup has finished restoring the saved wallpapers.
        _rotationTimer.Start();
    }

    private async Task RunDueRotationsAsync()
    {
        // Paused wallpapers keep their countdown expired; the change happens as soon as they resume.
        if (_rotating || _quitting || _changingWallpapers || !_initialized.Task.IsCompleted || IsPausedByEnvironment) { RefreshRotationStatus(); return; }
        _rotating = true;
        try
        {
            foreach (WallpaperRotationRule rule in _rotation.DueRules(DateTimeOffset.Now, _displayManager.GetDisplays()))
                await RotateAsync(rule, manual: false);
        }
        finally { _rotating = false; RefreshRotationStatus(); }
    }

    /// <summary>"Next wallpaper" from the tray: advances every rotation currently in charge of a display.</summary>
    private async Task RotateAllNowAsync()
    {
        IReadOnlyList<WallpaperRotationRule> rules = _rotation.ActiveRules(_displayManager.GetDisplays());
        if (rules.Count == 0)
        {
            _trayIcon.ShowNotification(Localization.T("NoRotationEnabled"), Localization.T("SetUpARotationFromTheRotationPage"), () => _ = OpenRotationAsync());
            return;
        }
        foreach (WallpaperRotationRule rule in rules) await RotateAsync(rule, manual: true);
        RefreshRotationStatus();
    }

    private async Task OpenRotationAsync()
    {
        await HandleLaunchAsync(new());
        _currentPage = "rotation";
        ShowRotation();
    }

    private async Task RotateAsync(WallpaperRotationRule rule, bool manual)
    {
        if (_changingWallpapers) { if (manual) SetRotationStatusText(() => Localization.T("AnotherWallpaperChangeIsInProgressTryAgainInAMoment")); return; }
        DateTimeOffset now = DateTimeOffset.Now;
        bool synchronized = rule.Target == WallpaperRotationRule.AllDisplays;
        WallpaperAssignmentsDocument state = _assignmentService.State;
        DisplayInfo? display = synchronized ? null : _displayManager.GetDisplays().FirstOrDefault(item => string.Equals(item.AssignmentKey, rule.Target, StringComparison.OrdinalIgnoreCase));
        if (!synchronized && display is null) { await SafePostponeAsync(rule); return; }

        string? shown = synchronized
            ? (state.Mode == WallpaperAssignmentMode.Independent ? null : state.GlobalTemplateId)
            : state.Mode == WallpaperAssignmentMode.Independent
                ? state.Assignments.FirstOrDefault(item => string.Equals(item.DisplayKey, rule.Target, StringComparison.OrdinalIgnoreCase))?.TemplateId
                : state.GlobalTemplateId;
        // Neighbouring displays keep different wallpapers whenever the pool allows it.
        string[] others = synchronized || state.Mode != WallpaperAssignmentMode.Independent ? []
            : state.Assignments.Where(item => !string.Equals(item.DisplayKey, rule.Target, StringComparison.OrdinalIgnoreCase)).Select(item => item.TemplateId).ToArray();
        string[] installed = _templates.Select(item => item.Template.Manifest.Id).ToArray();
        string? nextId = _rotation.PickNext(rule, shown ?? rule.CurrentTemplateId, installed, _favoriteTemplateIds, others, out IReadOnlyList<string> bag);
        TemplateCardViewModel? template = _templates.FirstOrDefault(item => string.Equals(item.Template.Manifest.Id, nextId, StringComparison.OrdinalIgnoreCase));
        if (template is null)
        {
            await SafePostponeAsync(rule);
            if (manual) SetRotationStatusText(() => Localization.T("ThisRotationHasNoInstalledWallpapersChooseSomeInTheRotationPage"));
            return;
        }
        bool active = synchronized ? _wallpaperHost.ActiveDisplayIds.Count > 0 : _wallpaperHost.ActiveDisplayIds.Contains(display!.Id) || _wallpaperHost.ActiveDisplayIds.Contains("span");
        if (active && string.Equals(template.Template.Manifest.Id, shown, StringComparison.OrdinalIgnoreCase))
        {
            await _rotation.MarkChangedAsync(rule.Target, template.Template.Manifest.Id, bag, now);
            if (manual) SetRotationStatusText(() => Localization.T("OnlyOneWallpaperIsAvailableInThisRotation"));
            return;
        }

        _changingWallpapers = true;
        SetWallpaperControlsEnabled(false);
        try
        {
            IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
            if (synchronized)
            {
                // A spanning setup keeps spanning; anything else shows the same scene on every display.
                WallpaperAssignmentMode mode = state.Mode == WallpaperAssignmentMode.Span ? WallpaperAssignmentMode.Span : WallpaperAssignmentMode.Clone;
                await _assignmentService.ApplyGlobalAsync(template.Template, settings, mode);
                SetRotationStatusText(() => Localization.F("RotationAllDisplaysNowShowFormat", template.Name));
            }
            else
            {
                await _assignmentService.ApplyAsync(template.Template, display!, settings);
                SetRotationStatusText(() => Localization.F("RotationDisplayNowShowsFormat", DisplayTitle(display!), template.Name));
            }
            await _rotation.MarkChangedAsync(rule.Target, template.Template.Manifest.Id, bag, now);
            await _logger.InfoAsync($"Rotation {(manual ? "manual" : "scheduled")} change on {rule.Target}: {template.Template.Manifest.Id}.");
        }
        catch (Exception exception)
        {
            await SafePostponeAsync(rule);
            SetRotationStatusText(() => Localization.F("RotationCouldNotChangeTheWallpaperFormat", exception.Message));
            await _logger.ErrorAsync($"Wallpaper rotation failed on {rule.Target}.", exception);
        }
        finally { _changingWallpapers = false; SetWallpaperControlsEnabled(true); RefreshScreens(); }
    }

    private void SetRotationStatusText(Func<string> text) => Localization.Set(DisplayStatus, TextBlock.TextProperty, text);

    private async Task SafePostponeAsync(WallpaperRotationRule rule)
    {
        try { await _rotation.PostponeAsync(rule.Target, DateTimeOffset.Now); }
        catch (Exception exception) { await _logger.ErrorAsync("Wallpaper rotation schedule could not be saved.", exception); }
    }

    private async Task ToggleRotationPauseAsync()
    {
        await SaveRotationOptionsAsync(!_rotation.Document.Paused, _rotation.Document.ChangeAtStartup);
        if (_currentPage == "rotation") ShowRotation();
    }

    private void Rotation_Click(object sender, RoutedEventArgs e) { _currentPage = "rotation"; ShowRotation(); }

    private void ShowRotation()
    {
        Localization.Set(PageTitle, TextBlock.TextProperty, () => Localization.T("Rotation"));
        Localization.Set(PageDescription, TextBlock.TextProperty, () => Localization.T("ChangeWallpapersAutomaticallyOnEveryDisplayOrOnEachDisplayWithItsOwnRhythm"));
        GalleryView.Visibility = Visibility.Collapsed;
        ScreensView.Visibility = Visibility.Collapsed;
        OnlineView.Visibility = Visibility.Collapsed;
        AboutView.Visibility = Visibility.Collapsed;
        RotationView.Visibility = Visibility.Visible;
        PageActions.Visibility = Visibility.Collapsed;
        DisplayStatus.Visibility = Visibility.Visible;
        RefreshScreens();
        BuildRotationPage();
    }

    private void BuildRotationPage()
    {
        RotationPanel.Children.Clear();
        _rotationEditors.Clear();
        WallpaperRotationDocument document = _rotation.Document;

        Border options = new() { Background = (Brush)FindResource("Panel"), CornerRadius = new CornerRadius(12), Padding = new Thickness(20, 16, 20, 16), Margin = new Thickness(0, 0, 0, 20) };
        WrapPanel toggles = new();
        CheckBox paused = new() { Content = Localization.T("PauseAllRotations"), IsChecked = document.Paused, Foreground = Brushes.White, Margin = new Thickness(0, 4, 28, 4) };
        CheckBox startup = new() { Content = Localization.T("ChangeWallpapersWhenSeeWallpaperStarts"), IsChecked = document.ChangeAtStartup, Foreground = Brushes.White, Margin = new Thickness(0, 4, 0, 4) };
        RoutedEventHandler save = async (_, _) => await SaveRotationOptionsAsync(paused.IsChecked == true, startup.IsChecked == true);
        paused.Checked += save; paused.Unchecked += save; startup.Checked += save; startup.Unchecked += save;
        toggles.Children.Add(paused);
        toggles.Children.Add(startup);
        options.Child = toggles;
        RotationPanel.Children.Add(options);

        AddRotationEditor(_rotation.GetOrDefault(WallpaperRotationRule.AllDisplays), Localization.T("AllDisplaysSynchronized"), Localization.T("TheSameWallpaperChangesOnEveryDisplayAtTheSameTime"), null);

        RotationPanel.Children.Add(new TextBlock { Text = Localization.T("EachDisplaySeparately"), FontSize = 20, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 12, 0, 4) });
        RotationPanel.Children.Add(new TextBlock { Text = Localization.T("GiveEachDisplayItsOwnRhythmAndWallpapersNeighbouringDisplaysAvoidShowingTheSameScene"), Foreground = (Brush)FindResource("Muted"), TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 12) });
        string? locked = _rotation.IsSynchronized ? Localization.T("PausedWhileTheSynchronizedRotationIsEnabled") : null;
        if (_displaySnapshot.Count == 0)
            RotationPanel.Children.Add(new TextBlock { Text = Localization.T("NoDisplaysDetectedConnectADisplayThenClickRefresh"), Foreground = (Brush)FindResource("Muted"), TextWrapping = TextWrapping.Wrap });
        foreach (DisplayInfo display in _displaySnapshot)
            AddRotationEditor(_rotation.GetOrDefault(display.AssignmentKey, display.Name), DisplayTitle(display) + (display.IsPrimary ? Localization.T("Primary") : ""), $"{display.Width} × {display.Height}", locked);
        RefreshRotationStatus();
    }

    private void AddRotationEditor(WallpaperRotationRule rule, string title, string details, string? locked)
    {
        RotationRuleEditor editor = new(rule, title, details, _templates, locked,
            async edited => await SaveRotationRuleAsync(edited),
            async () => await RotateAsync(_rotation.Find(rule.Target) ?? rule, manual: true));
        _rotationEditors.Add(editor);
        RotationPanel.Children.Add(editor);
    }

    private async Task SaveRotationRuleAsync(WallpaperRotationRule edited)
    {
        bool synchronizationChanged = edited.Target == WallpaperRotationRule.AllDisplays && edited.Enabled != _rotation.IsSynchronized;
        try
        {
            await _rotation.SaveRuleAsync(edited, DateTimeOffset.Now);
            RefreshRotationStatus();
        }
        catch (Exception exception)
        {
            SetRotationStatusText(() => Localization.T("TheRotationSettingsCouldNotBeSaved"));
            await _logger.ErrorAsync("Wallpaper rotation settings could not be saved.", exception);
        }
        // Display cards lock or unlock when the synchronized rotation takes over or hands back control.
        if (synchronizationChanged) _ = Dispatcher.BeginInvoke(BuildRotationPage);
    }

    private async Task SaveRotationOptionsAsync(bool paused, bool changeAtStartup)
    {
        try
        {
            await _rotation.SetOptionsAsync(paused, changeAtStartup, DateTimeOffset.Now);
            if (paused || _rotation.HasActiveRules) SetRotationStatusText(() => paused ? Localization.T("RotationsArePaused") : Localization.T("RotationsAreRunning"));
            RefreshRotationStatus();
        }
        catch (Exception exception)
        {
            SetRotationStatusText(() => Localization.T("TheRotationSettingsCouldNotBeSaved"));
            await _logger.ErrorAsync("Wallpaper rotation options could not be saved.", exception);
        }
    }

    private void RefreshRotationStatus()
    {
        if (_rotationEditors.Count == 0 || RotationView.Visibility != Visibility.Visible) return;
        foreach (RotationRuleEditor editor in _rotationEditors) editor.SetStatus(RotationStatus(_rotation.GetOrDefault(editor.Target)));
    }

    private string RotationStatus(WallpaperRotationRule rule)
    {
        if (!rule.Enabled) return Localization.T("RotationIsOff");
        string[] installed = _templates.Select(item => item.Template.Manifest.Id).ToArray();
        int count = WallpaperRotationService.Candidates(rule, installed, _favoriteTemplateIds).Length;
        if (count == 0) return Localization.T("NoWallpaperMatchesThisRotationChooseSomeBelow");
        string current = _templates.FirstOrDefault(item => string.Equals(item.Template.Manifest.Id, rule.CurrentTemplateId, StringComparison.OrdinalIgnoreCase))?.Name ?? "—";
        if (_rotation.Document.Paused) return Localization.F("RotationPausedFormat", count, current);
        if (IsPausedByEnvironment) return Localization.F("RotationWaitingWhileWallpapersArePausedFormat", count, current);
        DateTimeOffset next = rule.NextChangeAt ?? DateTimeOffset.Now;
        return Localization.F("RotationNextChangeFormat", next.LocalDateTime, FormatRemaining(next - DateTimeOffset.Now), count, current);
    }

    private static string FormatRemaining(TimeSpan remaining)
    {
        if (remaining < TimeSpan.FromMinutes(1)) return Localization.T("LessThanAMinute");
        if (remaining < TimeSpan.FromHours(1)) return Localization.F("MinutesShortFormat", (int)Math.Ceiling(remaining.TotalMinutes));
        if (remaining < TimeSpan.FromDays(1)) return Localization.F("HoursMinutesShortFormat", (int)remaining.TotalHours, remaining.Minutes);
        return Localization.F("DaysHoursShortFormat", (int)remaining.TotalDays, remaining.Hours);
    }
}
