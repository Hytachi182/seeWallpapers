using System.Windows;
using System.Windows.Media;
using System.IO;
using Microsoft.Win32;
using SeeWallpaper.Infrastructure;
using SeeWallpaper.TemplateEngine;
using SeeWallpaper.Engine;
using DisplayManager = SeeWallpaper.Platform.WindowsDisplayManager;
using DisplayManagerContract = SeeWallpaper.Platform.IDisplayManager;

namespace SeeWallpaper.App;

public partial class MainWindow : Window
{
    private readonly FileTemplateCatalog _catalog = new(new TemplateManifestValidator());
    private readonly FileApplicationLogger _logger;
    private readonly TemplateSettingsStore _settingsStore;
    private readonly TemplatePackageService _packageService = new(new TemplateManifestValidator());
    private readonly PerformanceSettingsStore _performanceSettingsStore;
    private readonly FavoritesStore _favoritesStore;
    private readonly WallpaperAssignmentsStore _assignmentsStore;
    private readonly TemplateLibraryService _libraryService = new(new TemplateManifestValidator());
    private readonly DesktopWallpaperHost _wallpaperHost = new();
    private readonly DisplayManagerContract _displayManager = new DisplayManager();
    private readonly WallpaperAssignmentService _assignmentService;
    private IReadOnlyList<TemplateCardViewModel> _templates = Array.Empty<TemplateCardViewModel>();
    private readonly string _templatesRoot;
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private readonly SeeWallpaper.Platform.WindowsEnvironmentMonitor _environmentMonitor = new();
    private bool _pauseOnFullscreen = true;
    private bool _pauseOnBattery;
    private bool _sessionLocked;
    private SeeWallpaper.Platform.WindowsEnvironmentState _environmentState = new(false, false);
    private HashSet<string> _favoriteTemplateIds = new(StringComparer.OrdinalIgnoreCase);
    private string _currentPage = "home";
    private bool _changingWallpapers;
    private IReadOnlyList<SeeWallpaper.Platform.DisplayInfo> _displaySnapshot = [];
    private readonly TaskCompletionSource _initialized = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly SemaphoreSlim _launchGate = new(1, 1);

    public MainWindow()
    {
        InitializeComponent();
        AboutVersion.Text = $"Version {typeof(MainWindow).Assembly.GetName().Version?.ToString(3)} · Windows x64";
        string dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "seeWallpaper");
        _logger = new FileApplicationLogger(dataRoot);
        _settingsStore = new TemplateSettingsStore(dataRoot);
        _performanceSettingsStore = new PerformanceSettingsStore(dataRoot);
        _favoritesStore = new FavoritesStore(dataRoot);
        _assignmentsStore = new WallpaperAssignmentsStore(dataRoot);
        _templatesRoot = Path.Combine(dataRoot, "templates");
        _assignmentService = new WallpaperAssignmentService(
            _wallpaperHost, _displayManager, _assignmentsStore,
            id => _templates.Select(item => item.Template).FirstOrDefault(item => string.Equals(item.Manifest.Id, id, StringComparison.OrdinalIgnoreCase)),
            template => _settingsStore.LoadAsync(template.Manifest.Id, template.Manifest.Settings.ToDictionary(setting => setting.Id, setting => setting.Default)));
        SystemEvents.SessionSwitch += OnSessionSwitch;
        SystemEvents.DisplaySettingsChanged += OnDisplaySettingsChanged;
        _environmentMonitor.StateChanged += OnEnvironmentStateChanged;
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await EnsureStarterTemplatesAsync();
            _favoriteTemplateIds = new HashSet<string>(await _favoritesStore.LoadAsync(), StringComparer.OrdinalIgnoreCase);
            PerformanceSettings configuration = await _performanceSettingsStore.LoadAsync();
            if (Enum.TryParse(configuration.Profile, true, out WallpaperPerformanceProfile profile)) _performanceProfile = profile;
            _pauseOnFullscreen = configuration.PauseOnFullscreen;
            _pauseOnBattery = configuration.PauseOnBattery;
            await _wallpaperHost.SetPerformanceProfileAsync(_performanceProfile);
            IReadOnlyList<SeeWallpaper.Core.InstalledTemplate> discovered = await _catalog.DiscoverAsync(_templatesRoot);
            Brush[] visuals = [new LinearGradientBrush(Color.FromRgb(0, 28, 17), Color.FromRgb(0, 160, 94), 25), new LinearGradientBrush(Color.FromRgb(23, 14, 46), Color.FromRgb(173, 71, 121), 35), new LinearGradientBrush(Color.FromRgb(8, 27, 54), Color.FromRgb(82, 67, 218), 45)];
            _templates = discovered.Select((template, index) => new TemplateCardViewModel(template, visuals[index % visuals.Length], _favoriteTemplateIds.Contains(template.Manifest.Id))).ToArray();
            TemplateList.ItemsSource = _templates;
            await _assignmentService.RestoreAsync(discovered.ToDictionary(template => template.Manifest.Id, StringComparer.OrdinalIgnoreCase), template => _settingsStore.LoadAsync(template.Manifest.Id, template.Manifest.Settings.ToDictionary(setting => setting.Id, setting => setting.Default)));
            RefreshScreens();
            DisplayStatus.Text = $"{_displaySnapshot.Count} display(s) detected. Choose a scene to apply.";
            await _logger.InfoAsync($"Started with {_templates.Count} local templates.");
        }
        catch (Exception exception)
        {
            DisplayStatus.Text = "Gallery could not be loaded";
            await _logger.ErrorAsync("Template discovery failed.", exception);
        }
        finally { _initialized.TrySetResult(); }
    }

    internal async Task HandleLaunchAsync(LaunchRequest request)
    {
        await _initialized.Task;
        await _launchGate.WaitAsync();
        try
        {
            if (request.Minimized) { WindowState = WindowState.Minimized; return; }
            if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
            Show();
            Activate();
            if (request.ShowScreens) { _currentPage = "screens"; ShowScreens(); }
            if (request.PackagePath is not null) await ImportPackageAsync(request.PackagePath);
        }
        finally { _launchGate.Release(); }
    }

    private void Home_Click(object sender, RoutedEventArgs e) { _currentPage = "home"; ShowPage("Choose your wallpaper", "Choose a scene, then select the displays where it should run.", _templates); }
    private void Gallery_Click(object sender, RoutedEventArgs e) { _currentPage = "gallery"; ShowPage("Gallery", "Browse templates installed with seeWallpaper.", _templates); }
    private void Installed_Click(object sender, RoutedEventArgs e) { _currentPage = "installed"; ShowPage("Installed", $"{_templates.Count} templates available locally.", _templates); }
    private void Favorites_Click(object sender, RoutedEventArgs e) { _currentPage = "favorites"; ShowPage("Favorites", "Your saved scenes.", _templates.Where(template => template.IsFavorite).ToArray()); }
    private void Create_Click(object sender, RoutedEventArgs e) => ShowPage("Create", "The visual template editor is planned after the engine and SDK are stable.", Array.Empty<TemplateCardViewModel>());
    private async void Settings_Click(object sender, RoutedEventArgs e)
    {
        PerformanceSettingsWindow dialog = new(_performanceProfile, _pauseOnFullscreen, _pauseOnBattery) { Owner = this };
        if (dialog.ShowDialog() != true) return;
        _performanceProfile = dialog.SelectedProfile;
        _pauseOnFullscreen = dialog.PauseOnFullscreen;
        _pauseOnBattery = dialog.PauseOnBattery;
        await _performanceSettingsStore.SaveAsync(new PerformanceSettings(_performanceProfile.ToString(), _pauseOnFullscreen, _pauseOnBattery));
        await _wallpaperHost.SetPerformanceProfileAsync(_performanceProfile);
        await ApplyPauseStateAsync();
        DisplayStatus.Text = $"Performance: {_performanceProfile}";
        await _logger.InfoAsync($"Performance profile changed to {_performanceProfile}.");
    }
    private async void Preview_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
        WallpaperPreviewWindow preview = new(template.Template, settings) { Owner = this };
        preview.Show();
    }

    private async void Customize_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
        WallpaperPreviewWindow preview = new(template.Template, settings) { Owner = this };
        preview.Show();
        new TemplateSettingsWindow(template.Template, preview, _settingsStore, settings).Show();
    }

    private async void Apply_Click(object sender, RoutedEventArgs e)
    {
        if (_changingWallpapers || ((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        List<string> completed = [];
        try
        {
            RefreshScreens();
            ApplyModeWindow dialog = new(CreateDisplayCards(), template.Name, IdentifyDisplays) { Owner = this };
            if (dialog.ShowDialog() != true) return;
            _changingWallpapers = true;
            SetWallpaperControlsEnabled(false);
            DisplayStatus.Text = $"Applying {template.Name}…";
            IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
            switch (dialog.SelectedMode)
            {
                case WallpaperApplicationMode.Clone:
                    await _assignmentService.ApplyGlobalAsync(template.Template, settings, WallpaperAssignmentMode.Clone);
                    DisplayStatus.Text = $"{template.Name} applied to all displays.";
                    break;
                case WallpaperApplicationMode.Span:
                    await _assignmentService.ApplyGlobalAsync(template.Template, settings, WallpaperAssignmentMode.Span);
                    DisplayStatus.Text = $"{template.Name} spanning all displays.";
                    break;
                default:
                    foreach (SeeWallpaper.Platform.DisplayInfo display in dialog.SelectedDisplays)
                    {
                        await _assignmentService.ApplyAsync(template.Template, display, settings);
                        completed.Add(DisplayTitle(display));
                    }
                    DisplayStatus.Text = $"{template.Name} applied to: {string.Join(", ", completed)}.";
                    break;
            }
            await _logger.InfoAsync($"Wallpaper applied: {template.Template.Manifest.Id}.");
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Wallpaper application failed.", exception);
            DisplayStatus.Text = completed.Count > 0 ? $"Partially applied: {string.Join(", ", completed)}. {exception.Message}" : $"Application interrupted: {exception.Message}";
            MessageBox.Show(DisplayStatus.Text, "Apply wallpaper", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { _changingWallpapers = false; SetWallpaperControlsEnabled(true); RefreshScreens(); }
    }
    private async void Import_Click(object sender, RoutedEventArgs e)
    {
        OpenFileDialog dialog = new() { Filter = "seeWallpaper package (*.seewall)|*.seewall", Multiselect = false };
        if (dialog.ShowDialog(this) != true) return;
        await ImportPackageAsync(dialog.FileName);
    }

    private async Task ImportPackageAsync(string packagePath)
    {
        try
        {
            SeeWallpaper.Core.InstalledTemplate imported = await _packageService.ImportAsync(packagePath, _templatesRoot);
            await _logger.InfoAsync($"Template imported: {imported.Manifest.Id}.");
            await RefreshTemplatesAsync();
            _currentPage = "installed";
            ShowCurrentPage();
            DisplayStatus.Text = $"Imported: {imported.Manifest.Name}";
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template import failed.", exception);
            MessageBox.Show(exception.Message, "Import failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void Export_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        SaveFileDialog dialog = new() { Filter = "seeWallpaper package (*.seewall)|*.seewall", FileName = $"{template.Template.Manifest.Id}.seewall", AddExtension = true, DefaultExt = ".seewall" };
        if (dialog.ShowDialog(this) != true) return;
        try
        {
            await _packageService.ExportAsync(template.Template, dialog.FileName);
            await _logger.InfoAsync($"Template exported: {template.Template.Manifest.Id}.");
            DisplayStatus.Text = $"Exported: {Path.GetFileName(dialog.FileName)}";
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template export failed.", exception);
            MessageBox.Show(exception.Message, "Export failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
    private async void Favorite_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        if (!_favoriteTemplateIds.Add(template.Template.Manifest.Id)) _favoriteTemplateIds.Remove(template.Template.Manifest.Id);
        await _favoritesStore.SaveAsync(_favoriteTemplateIds);
        await RefreshTemplatesAsync();
        ShowCurrentPage();
    }

    private async void Duplicate_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        try
        {
            SeeWallpaper.Core.InstalledTemplate duplicate = await _libraryService.DuplicateAsync(template.Template, _templatesRoot);
            await _logger.InfoAsync($"Template duplicated: {template.Template.Manifest.Id} -> {duplicate.Manifest.Id}.");
            await RefreshTemplatesAsync();
            DisplayStatus.Text = $"Duplicated: {duplicate.Manifest.Name}";
            ShowCurrentPage();
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template duplication failed.", exception);
            MessageBox.Show(exception.Message, "Duplicate failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void Uninstall_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        if (MessageBox.Show($"Uninstall {template.Name}?", "Confirm uninstall", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes) return;
        try
        {
            await _libraryService.UninstallAsync(template.Template, _templatesRoot);
            _favoriteTemplateIds.Remove(template.Template.Manifest.Id);
            await _favoritesStore.SaveAsync(_favoriteTemplateIds);
            await _logger.InfoAsync($"Template uninstalled: {template.Template.Manifest.Id}.");
            await RefreshTemplatesAsync();
            DisplayStatus.Text = $"Uninstalled: {template.Name}";
            ShowCurrentPage();
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template uninstall failed.", exception);
            MessageBox.Show(exception.Message, "Uninstall failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
    private void ShowPage(string title, string description, IReadOnlyList<TemplateCardViewModel> templates) { GalleryView.Visibility = Visibility.Visible; ScreensView.Visibility = Visibility.Collapsed; AboutView.Visibility = Visibility.Collapsed; PageActions.Visibility = Visibility.Visible; DisplayStatus.Visibility = Visibility.Visible; PageTitle.Text = title; PageDescription.Text = description; TemplateList.ItemsSource = templates; }
    private void About_Click(object sender, RoutedEventArgs e) { _currentPage = "about"; ShowAbout(); }
    private void ShowAbout()
    {
        PageTitle.Text = "About";
        PageDescription.Text = "The creator, available features, and ways to get started.";
        GalleryView.Visibility = Visibility.Collapsed;
        ScreensView.Visibility = Visibility.Collapsed;
        AboutView.Visibility = Visibility.Visible;
        PageActions.Visibility = Visibility.Collapsed;
        DisplayStatus.Visibility = Visibility.Collapsed;
    }
    protected override async void OnClosed(EventArgs e) { SystemEvents.SessionSwitch -= OnSessionSwitch; SystemEvents.DisplaySettingsChanged -= OnDisplaySettingsChanged; _environmentMonitor.StateChanged -= OnEnvironmentStateChanged; _environmentMonitor.Dispose(); await _wallpaperHost.DisposeAsync(); base.OnClosed(e); }
    private static IReadOnlyDictionary<string, object?> CreateDefaultSettings(TemplateCardViewModel template) => template.Template.Manifest.Settings.ToDictionary(setting => setting.Id, setting => setting.Default);
    private Task<IReadOnlyDictionary<string, object?>> LoadSettingsAsync(TemplateCardViewModel template) => _settingsStore.LoadAsync(template.Template.Manifest.Id, CreateDefaultSettings(template));
    private async Task RefreshTemplatesAsync()
    {
        IReadOnlyList<SeeWallpaper.Core.InstalledTemplate> discovered = await _catalog.DiscoverAsync(_templatesRoot);
        Brush[] visuals = [new LinearGradientBrush(Color.FromRgb(0, 28, 17), Color.FromRgb(0, 160, 94), 25), new LinearGradientBrush(Color.FromRgb(23, 14, 46), Color.FromRgb(173, 71, 121), 35), new LinearGradientBrush(Color.FromRgb(8, 27, 54), Color.FromRgb(82, 67, 218), 45)];
        _templates = discovered.Select((template, index) => new TemplateCardViewModel(template, visuals[index % visuals.Length], _favoriteTemplateIds.Contains(template.Manifest.Id))).ToArray();
        TemplateList.ItemsSource = _templates;
        RefreshScreens();
    }
    private async Task EnsureStarterTemplatesAsync()
    {
        Directory.CreateDirectory(_templatesRoot);
        string startersRoot = Path.Combine(AppContext.BaseDirectory, "templates");
        foreach (string source in Directory.EnumerateDirectories(startersRoot))
        {
            string target = Path.Combine(_templatesRoot, Path.GetFileName(source));
            if (!Directory.Exists(target) || IsOfficialTemplateUpdate(source, target)) await Task.Run(() => CopyDirectory(source, target));
        }
    }
    private static void CopyDirectory(string source, string target)
    {
        Directory.CreateDirectory(target);
        foreach (string file in Directory.EnumerateFiles(source)) File.Copy(file, Path.Combine(target, Path.GetFileName(file)), true);
        foreach (string directory in Directory.EnumerateDirectories(source)) CopyDirectory(directory, Path.Combine(target, Path.GetFileName(directory)));
    }
    private static bool IsOfficialTemplateUpdate(string source, string target)
    {
        try
        {
            using System.Text.Json.JsonDocument sourceManifest = System.Text.Json.JsonDocument.Parse(File.ReadAllText(Path.Combine(source, "manifest.json")));
            using System.Text.Json.JsonDocument targetManifest = System.Text.Json.JsonDocument.Parse(File.ReadAllText(Path.Combine(target, "manifest.json")));
            string? sourceAuthor = sourceManifest.RootElement.GetProperty("author").GetString();
            string? sourceVersion = sourceManifest.RootElement.GetProperty("version").GetString();
            string? targetVersion = targetManifest.RootElement.GetProperty("version").GetString();
            return string.Equals(sourceAuthor, "seeWallpaper", StringComparison.Ordinal) && Version.TryParse(sourceVersion, out Version? sourceParsed) && Version.TryParse(targetVersion, out Version? targetParsed) && sourceParsed > targetParsed;
        }
        catch (Exception)
        {
            return false;
        }
    }
    private async void OnSessionSwitch(object sender, SessionSwitchEventArgs eventArgs)
    {
        if (eventArgs.Reason == SessionSwitchReason.SessionLock) _sessionLocked = true;
        if (eventArgs.Reason == SessionSwitchReason.SessionUnlock) _sessionLocked = false;
        await ApplyPauseStateAsync();
    }
    private void OnEnvironmentStateChanged(object? sender, SeeWallpaper.Platform.WindowsEnvironmentState state) => _ = Dispatcher.InvokeAsync(async () => { _environmentState = state; await ApplyPauseStateAsync(); });
    private Task ApplyPauseStateAsync() => _wallpaperHost.SetPausedAsync(_sessionLocked || (_pauseOnFullscreen && _environmentState.IsFullscreenApplicationActive) || (_pauseOnBattery && _environmentState.IsOnBattery));
    private void ShowCurrentPage()
    {
        if (_currentPage == "favorites") ShowPage("Favorites", "Your saved scenes.", _templates.Where(template => template.IsFavorite).ToArray());
        else if (_currentPage == "installed") ShowPage("Installed", $"{_templates.Count} templates available locally.", _templates);
        else if (_currentPage == "gallery") ShowPage("Gallery", "Browse templates installed with seeWallpaper.", _templates);
        else if (_currentPage == "screens") ShowScreens();
        else if (_currentPage == "about") ShowAbout();
        else ShowPage("Choose your wallpaper", "Choose a scene, then select the displays where it should run.", _templates);
    }

    private void Screens_Click(object sender, RoutedEventArgs e) { _currentPage = "screens"; ShowScreens(); }
    private void ShowScreens()
    {
        PageTitle.Text = "My displays";
        PageDescription.Text = "Choose a wallpaper for each display, then click Apply to this display.";
        GalleryView.Visibility = Visibility.Collapsed;
        ScreensView.Visibility = Visibility.Visible;
        AboutView.Visibility = Visibility.Collapsed;
        PageActions.Visibility = Visibility.Visible;
        DisplayStatus.Visibility = Visibility.Visible;
        RefreshScreens();
    }

    private IReadOnlyList<DisplayCardViewModel> CreateDisplayCards()
    {
        WallpaperAssignmentsDocument state = _assignmentService.State;
        bool span = state.Mode == WallpaperAssignmentMode.Span;
        return _displaySnapshot.Select((display, index) =>
        {
            string? templateId = state.Mode == WallpaperAssignmentMode.Independent
                ? state.Assignments.FirstOrDefault(item => string.Equals(item.DisplayKey, display.AssignmentKey, StringComparison.OrdinalIgnoreCase))?.TemplateId
                : state.GlobalTemplateId;
            TemplateCardViewModel? template = _templates.FirstOrDefault(item => string.Equals(item.Template.Manifest.Id, templateId, StringComparison.OrdinalIgnoreCase));
            bool active = _wallpaperHost.ActiveDisplayIds.Contains(display.Id) || (span && _wallpaperHost.ActiveDisplayIds.Contains("span"));
            string scene = active ? $"Active: {template?.Name ?? templateId}" + (span ? " · Spanning" : "")
                : templateId is null ? "No wallpaper applied to this display" : $"Saved choice, inactive: {template?.Name ?? templateId}";
            return new DisplayCardViewModel(display, index + 1, scene, _templates, templateId, active, span);
        }).ToArray();
    }

    private void RefreshScreens()
    {
        _displaySnapshot = _displayManager.GetDisplays().OrderBy(display => display.Id, StringComparer.OrdinalIgnoreCase).ToArray();
        DisplayList.ItemsSource = CreateDisplayCards();
        WallpaperAssignmentsDocument state = _assignmentService.State;
        int disconnected = state.Assignments.Count(saved => !_displaySnapshot.Any(display => string.Equals(display.AssignmentKey, saved.DisplayKey, StringComparison.OrdinalIgnoreCase)));
        ScreenNotice.Text = _displaySnapshot.Count == 0 ? "No displays detected. Connect a display, then click Refresh."
            : state.Mode == WallpaperAssignmentMode.Span ? "Span mode: applying to one display restores independent mode; other displays receive the previous wallpaper."
            : disconnected > 0 ? $"{disconnected} assignment(s) retained for disconnected displays."
            : "Applying replaces only the chosen display's wallpaper. Your choices are saved automatically.";
        DrawDisplayLayout();
    }

    private void DrawDisplayLayout()
    {
        DisplayLayout.Children.Clear();
        if (_displaySnapshot.Count == 0) return;
        int left = _displaySnapshot.Min(display => display.X), top = _displaySnapshot.Min(display => display.Y);
        double width = _displaySnapshot.Max(display => display.X + display.Width) - left;
        double height = _displaySnapshot.Max(display => display.Y + display.Height) - top;
        double scale = Math.Min(620 / Math.Max(width, 1), 140 / Math.Max(height, 1));
        foreach (DisplayCardViewModel card in CreateDisplayCards())
        {
            System.Windows.Controls.Border monitor = new()
            {
                Width = Math.Max(1, card.Display.Width * scale - 4), Height = Math.Max(1, card.Display.Height * scale - 4),
                Background = (Brush)FindResource("Panel"), BorderBrush = (Brush)FindResource(card.Display.IsPrimary ? "Accent" : "Muted"), BorderThickness = new Thickness(2), CornerRadius = new CornerRadius(6),
                ToolTip = $"{card.Title} · {card.CurrentScene}",
                Child = new System.Windows.Controls.Viewbox { Child = new System.Windows.Controls.TextBlock { Text = $"Display {card.Number}", Foreground = Brushes.White, Margin = new Thickness(12) } }
            };
            System.Windows.Controls.Canvas.SetLeft(monitor, (card.Display.X - left) * scale);
            System.Windows.Controls.Canvas.SetTop(monitor, (card.Display.Y - top) * scale);
            DisplayLayout.Children.Add(monitor);
        }
    }

    private string DisplayTitle(SeeWallpaper.Platform.DisplayInfo display)
    {
        int index = _displaySnapshot.ToList().FindIndex(item => item.Id == display.Id);
        return index < 0 ? display.Label : $"Display {index + 1}";
    }

    private void Identify_Click(object sender, RoutedEventArgs e) => IdentifyDisplays();
    private void IdentifyDisplays()
    {
        foreach ((SeeWallpaper.Platform.DisplayInfo display, int index) in _displaySnapshot.Select((display, index) => (display, index)))
            new DisplayIdentificationWindow(display, index + 1) { Owner = this }.Show();
    }
    private void RefreshScreens_Click(object sender, RoutedEventArgs e) => RefreshScreens();
    private void OnDisplaySettingsChanged(object? sender, EventArgs e) => _ = Dispatcher.InvokeAsync(RefreshScreens);
    private void SetWallpaperControlsEnabled(bool enabled) { GalleryView.IsEnabled = enabled; DisplayList.IsEnabled = enabled; }

    private async void ApplyToScreen_Click(object sender, RoutedEventArgs e)
    {
        if (_changingWallpapers || ((FrameworkElement)sender).Tag is not DisplayCardViewModel card) return;
        if (card.SelectedTemplate is null) { DisplayStatus.Text = $"Choose a wallpaper for {card.Title}."; return; }
        _changingWallpapers = true;
        SetWallpaperControlsEnabled(false);
        try
        {
            DisplayStatus.Text = $"Applying {card.SelectedTemplate.Name} to {card.Title}…";
            await _assignmentService.ApplyAsync(card.SelectedTemplate.Template, card.Display, await LoadSettingsAsync(card.SelectedTemplate));
            DisplayStatus.Text = $"{card.SelectedTemplate.Name} applied to {card.Title}.";
            await _logger.InfoAsync($"Wallpaper {card.SelectedTemplate.Template.Manifest.Id} applied to {card.Display.Id}.");
        }
        catch (Exception exception)
        {
            DisplayStatus.Text = $"{card.Title} : {exception.Message}";
            await _logger.ErrorAsync("Display wallpaper application failed.", exception);
            MessageBox.Show(exception.Message, $"Apply to {card.Title}", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { _changingWallpapers = false; SetWallpaperControlsEnabled(true); RefreshScreens(); }
    }

    private async void RemoveFromScreen_Click(object sender, RoutedEventArgs e)
    {
        if (_changingWallpapers || ((FrameworkElement)sender).Tag is not DisplayCardViewModel card) return;
        _changingWallpapers = true;
        SetWallpaperControlsEnabled(false);
        try
        {
            await _assignmentService.RemoveAsync(card.Display);
            DisplayStatus.Text = $"Wallpaper removed from {card.Title}.";
            await _logger.InfoAsync($"Wallpaper removed from {card.Display.Id}.");
        }
        catch (Exception exception)
        {
            DisplayStatus.Text = $"{card.Title} : {exception.Message}";
            await _logger.ErrorAsync("Display wallpaper removal failed.", exception);
            MessageBox.Show(exception.Message, "Remove wallpaper", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { _changingWallpapers = false; SetWallpaperControlsEnabled(true); RefreshScreens(); }
    }
}
