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
    private readonly DesktopWallpaperHost _wallpaperHost = new();
    private readonly DisplayManagerContract _displayManager = new DisplayManager();
    private IReadOnlyList<TemplateCardViewModel> _templates = Array.Empty<TemplateCardViewModel>();
    private readonly string _templatesRoot;
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private readonly SeeWallpaper.Platform.WindowsEnvironmentMonitor _environmentMonitor = new();
    private bool _pauseOnFullscreen = true;
    private bool _pauseOnBattery;
    private bool _sessionLocked;
    private SeeWallpaper.Platform.WindowsEnvironmentState _environmentState = new(false, false);

    public MainWindow()
    {
        InitializeComponent();
        string dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "seeWallpaper");
        _logger = new FileApplicationLogger(dataRoot);
        _settingsStore = new TemplateSettingsStore(dataRoot);
        _performanceSettingsStore = new PerformanceSettingsStore(dataRoot);
        _templatesRoot = Path.Combine(dataRoot, "templates");
        SystemEvents.SessionSwitch += OnSessionSwitch;
        _environmentMonitor.StateChanged += OnEnvironmentStateChanged;
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await EnsureStarterTemplatesAsync();
            PerformanceSettings configuration = await _performanceSettingsStore.LoadAsync();
            if (Enum.TryParse(configuration.Profile, true, out WallpaperPerformanceProfile profile)) _performanceProfile = profile;
            _pauseOnFullscreen = configuration.PauseOnFullscreen;
            _pauseOnBattery = configuration.PauseOnBattery;
            await _wallpaperHost.SetPerformanceProfileAsync(_performanceProfile);
            IReadOnlyList<SeeWallpaper.Core.InstalledTemplate> discovered = await _catalog.DiscoverAsync(_templatesRoot);
            Brush[] visuals = [new LinearGradientBrush(Color.FromRgb(0, 28, 17), Color.FromRgb(0, 160, 94), 25), new LinearGradientBrush(Color.FromRgb(23, 14, 46), Color.FromRgb(173, 71, 121), 35), new LinearGradientBrush(Color.FromRgb(8, 27, 54), Color.FromRgb(82, 67, 218), 45)];
            _templates = discovered.Select((template, index) => new TemplateCardViewModel(template, visuals[index % visuals.Length])).ToArray();
            TemplateList.ItemsSource = _templates;
            DisplayStatus.Text = $"{_displayManager.GetDisplays().Count} display(s) detected";
            await _logger.InfoAsync($"Started with {_templates.Count} local templates.");
        }
        catch (Exception exception)
        {
            DisplayStatus.Text = "Gallery could not be loaded";
            await _logger.ErrorAsync("Template discovery failed.", exception);
        }
    }

    private void Home_Click(object sender, RoutedEventArgs e) => ShowPage("A desktop that moves with you", "Featured original scenes ready to preview.", _templates);
    private void Gallery_Click(object sender, RoutedEventArgs e) => ShowPage("Gallery", "Browse templates installed with seeWallpaper.", _templates);
    private void Installed_Click(object sender, RoutedEventArgs e) => ShowPage("Installed", $"{_templates.Count} templates available locally.", _templates);
    private void Favorites_Click(object sender, RoutedEventArgs e) => ShowPage("Favorites", "Your saved scenes will appear here.", Array.Empty<TemplateCardViewModel>());
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
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        try
        {
            IReadOnlyList<SeeWallpaper.Platform.DisplayInfo> displays = _displayManager.GetDisplays();
            ApplyModeWindow dialog = new(displays) { Owner = this };
            if (dialog.ShowDialog() != true) return;
            IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
            switch (dialog.SelectedMode)
            {
                case WallpaperApplicationMode.Clone:
                    await _wallpaperHost.ApplyCloneAsync(template.Template, settings);
                    DisplayStatus.Text = $"Cloned: {template.Name}";
                    break;
                case WallpaperApplicationMode.Span:
                    await _wallpaperHost.ApplySpanAsync(template.Template, settings);
                    DisplayStatus.Text = $"Spanning: {template.Name}";
                    break;
                default:
                    if (dialog.SelectedDisplay is null) throw new InvalidOperationException("Choose an available display.");
                    await _wallpaperHost.ApplyAsync(template.Template, dialog.SelectedDisplay.Id, settings);
                    DisplayStatus.Text = $"Applied: {template.Name}";
                    break;
            }
            await _logger.InfoAsync($"Wallpaper applied: {template.Template.Manifest.Id}.");
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Wallpaper application failed.", exception);
            MessageBox.Show(exception.Message, "Wallpaper could not be applied", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
    private async void Import_Click(object sender, RoutedEventArgs e)
    {
        OpenFileDialog dialog = new() { Filter = "seeWallpaper package (*.seewall)|*.seewall", Multiselect = false };
        if (dialog.ShowDialog(this) != true) return;
        try
        {
            SeeWallpaper.Core.InstalledTemplate imported = await _packageService.ImportAsync(dialog.FileName, _templatesRoot);
            await _logger.InfoAsync($"Template imported: {imported.Manifest.Id}.");
            await RefreshTemplatesAsync();
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
    private void ShowPage(string title, string description, IReadOnlyList<TemplateCardViewModel> templates) { PageTitle.Text = title; PageDescription.Text = description; TemplateList.ItemsSource = templates; }
    protected override async void OnClosed(EventArgs e) { SystemEvents.SessionSwitch -= OnSessionSwitch; _environmentMonitor.StateChanged -= OnEnvironmentStateChanged; _environmentMonitor.Dispose(); await _wallpaperHost.DisposeAsync(); base.OnClosed(e); }
    private static IReadOnlyDictionary<string, object?> CreateDefaultSettings(TemplateCardViewModel template) => template.Template.Manifest.Settings.ToDictionary(setting => setting.Id, setting => setting.Default);
    private Task<IReadOnlyDictionary<string, object?>> LoadSettingsAsync(TemplateCardViewModel template) => _settingsStore.LoadAsync(template.Template.Manifest.Id, CreateDefaultSettings(template));
    private async Task RefreshTemplatesAsync()
    {
        IReadOnlyList<SeeWallpaper.Core.InstalledTemplate> discovered = await _catalog.DiscoverAsync(_templatesRoot);
        Brush[] visuals = [new LinearGradientBrush(Color.FromRgb(0, 28, 17), Color.FromRgb(0, 160, 94), 25), new LinearGradientBrush(Color.FromRgb(23, 14, 46), Color.FromRgb(173, 71, 121), 35), new LinearGradientBrush(Color.FromRgb(8, 27, 54), Color.FromRgb(82, 67, 218), 45)];
        _templates = discovered.Select((template, index) => new TemplateCardViewModel(template, visuals[index % visuals.Length])).ToArray();
        TemplateList.ItemsSource = _templates;
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
}
