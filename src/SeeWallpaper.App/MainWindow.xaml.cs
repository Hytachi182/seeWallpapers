using System.Windows;
using System.Windows.Media;
using System.IO;
using System.Net.Http;
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
    private IReadOnlyList<TemplateCardViewModel> _galleryTemplates = [];
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
    private readonly System.Windows.Threading.DispatcherTimer _displayChangeTimer = new() { Interval = TimeSpan.FromMilliseconds(750) };
    private readonly CancellationTokenSource _displayChangeLifetime = new();
    private readonly SemaphoreSlim _launchGate = new(1, 1);
    private readonly TrayIcon _trayIcon;
    private bool _quitting;
    private static readonly HttpClient OnlineHttp = CreateOnlineHttpClient();
    private readonly OnlineTemplateStore _onlineStore = new(OnlineHttp, new TemplateManifestValidator(), "Hytachi182", "seeWallpapers");
    private readonly System.Windows.Threading.DispatcherTimer _onlineTimer = new() { Interval = TimeSpan.FromHours(6) };
    private IReadOnlyList<OnlineTemplate> _onlineCatalog = [];
    private IReadOnlyList<OnlineTemplateCardViewModel> _onlineOffers = [];
    private readonly HashSet<string> _notifiedOnlineIds = new(StringComparer.Ordinal);
    private Func<string> _onlineNotice = () => Localization.T("CheckingGitHubForNewWallpapers");
    private bool _checkingOnline;
    private readonly StartupRegistration _startup = new();
    private bool _startupBannerDismissed;
    private readonly ApplicationUpdateService _applicationUpdates = new(OnlineHttp);
    private ApplicationUpdateResult? _availableUpdate;
    private bool _manualApplicationUpdate;
    private CancellationTokenSource? _updateDownload;

    private void Language_Click(object sender, RoutedEventArgs e)
    {
        System.Windows.Controls.ContextMenu menu = new()
        {
            PlacementTarget = LanguageButton,
            Placement = System.Windows.Controls.Primitives.PlacementMode.Top,
            Background = (Brush)FindResource("Panel"), Foreground = Brushes.White
        };
        foreach (AppLanguage language in SupportedLanguages.All)
        {
            System.Windows.Controls.MenuItem item = new()
            {
                Header = language.NativeName, IsCheckable = true, IsChecked = Localization.Current.Language == language.Code,
                Padding = new Thickness(12, 8, 12, 8)
            };
            item.Click += (_, _) =>
            {
                try { Localization.Current.ChangeLanguage(language.Code); }
                catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
                {
                    MessageBox.Show(Localization.T("LanguageCouldNotBeSavedCheckAccessToYourLocalApplicationDataAndTryAgain"),
                        Localization.T("Language"), MessageBoxButton.OK, MessageBoxImage.Error);
                }
            };
            menu.Items.Add(item);
        }
        LanguageButton.ContextMenu = menu;
        menu.IsOpen = true;
    }

    private void OnLanguageChanged(object? sender, EventArgs e)
    {
        // Keep pending per-display choices while refreshing translated view models.
        Dictionary<string, string?> selections = (DisplayList.ItemsSource as IEnumerable<DisplayCardViewModel> ?? [])
            .ToDictionary(card => card.Display.Id, card => card.SelectedTemplate?.Template.Manifest.Id);
        ShowCurrentPage();
        if (DisplayList.ItemsSource is IEnumerable<DisplayCardViewModel> cards)
            foreach (DisplayCardViewModel card in cards)
                if (selections.TryGetValue(card.Display.Id, out string? id))
                    card.SelectedTemplate = card.Templates.FirstOrDefault(template => template.Template.Manifest.Id == id);
        // Rebind card getters without reloading templates or restarting the desktop hosts.
        System.Collections.IEnumerable? gallery = TemplateList.ItemsSource;
        TemplateList.ItemsSource = null;
        TemplateList.ItemsSource = gallery;
        OnlineList.ItemsSource = null;
        OnlineList.ItemsSource = _onlineOffers;
    }

    private async void CheckUpdate_Click(object sender, RoutedEventArgs e)
    {
        if (!CheckUpdateButton.IsEnabled) return;
        CheckUpdateButton.IsEnabled = false;
        Localization.Set(CheckUpdateButton, System.Windows.Controls.ContentControl.ContentProperty, () => Localization.T("Checking"));
        UpdateBanner.Visibility = Visibility.Visible;
        Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("CheckingForUpdates"));
        Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ComparingYourInstalledVersionWithGitHubMain"));
        DownloadUpdateButton.Visibility = Visibility.Collapsed;
        _availableUpdate = null;
        try
        {
            Version installed = typeof(MainWindow).Assembly.GetName().Version ?? throw new InvalidOperationException("Installed version unavailable.");
            ApplicationUpdateResult result = await _applicationUpdates.CheckAsync(installed);
            if (result.UpdateAvailable)
            {
                Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("UpdateAvailableFormat", result.MainVersion.ToString(3)));
                _availableUpdate = result;
                _manualApplicationUpdate = !ApplicationUpdateInstaller.IsInstalled(AppContext.BaseDirectory);
                Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T(
                    _manualApplicationUpdate ? "ManualApplicationUpdateReady" : "AutomaticUpdateReady"));
                Localization.Set(DownloadUpdateButton, System.Windows.Controls.ContentControl.ContentProperty, () => Localization.T(
                    _manualApplicationUpdate ? "DownloadApplicationUpdateOnGitHub" : "InstallApplicationUpdate"));
                DownloadUpdateButton.Visibility = result.ReleaseUrl is null ? Visibility.Collapsed : Visibility.Visible;
            }
            else
            {
                Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("YouAreUpToDate"));
                Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("InstalledGitHubMainNoNewerVersionIsAvailableFormat", result.InstalledVersion.ToString(3), result.MainVersion.ToString(3)));
            }
        }
        catch (Exception exception)
        {
            Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("UpdateCheckFailed"));
            Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("CouldNotVerifyUpdatesOnGitHubCheckYourConnectionAndClickCheckUpdateToRetry"));
            await _logger.ErrorAsync("Application update check failed.", exception);
        }
        finally
        {
            Localization.Set(CheckUpdateButton, System.Windows.Controls.ContentControl.ContentProperty, () => Localization.T("CheckUpdate"));
            CheckUpdateButton.IsEnabled = true;
        }
    }

    private async void DownloadUpdate_Click(object sender, RoutedEventArgs e)
    {
        if (_availableUpdate is null || _updateDownload is not null) return;
        if (_manualApplicationUpdate)
        {
            Uri? download = _availableUpdate.Portable?.Url ?? _availableUpdate.ReleaseUrl;
            if (download is null) return;
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(download.AbsoluteUri) { UseShellExecute = true });
            }
            catch (Exception exception)
            {
                Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ApplicationUpdateFailed"));
                Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ApplicationUpdateRetry"));
                await _logger.ErrorAsync("Could not open the GitHub update download.", exception);
            }
            return;
        }
        using CancellationTokenSource lifetime = new(TimeSpan.FromMinutes(15));
        _updateDownload = lifetime;
        CheckUpdateButton.IsEnabled = false;
        DownloadUpdateButton.IsEnabled = false;
        DownloadUpdateButton.Visibility = Visibility.Collapsed;
        CancelUpdateButton.Visibility = Visibility.Visible;
        UpdateProgress.Visibility = Visibility.Visible;
        UpdateProgress.Value = 0;
        Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("DownloadingApplicationUpdate"));
        try
        {
            using HttpClient downloadHttp = CreateOnlineHttpClient();
            downloadHttp.Timeout = Timeout.InfiniteTimeSpan;
            Progress<int> progress = new(percent =>
            {
                UpdateProgress.Value = percent;
                Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("UpdateDownloadProgressFormat", percent));
            });
            string work = await new ApplicationUpdateInstaller(downloadHttp).PrepareAsync(_availableUpdate, AppContext.BaseDirectory,
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "seeWallpaper", "updates"), progress, lifetime.Token,
                Localization.T("AutomaticUpdateFailedAfterExit"), Localization.T("ApplicationUpdates"));
            lifetime.Token.ThrowIfCancellationRequested();
            CancelUpdateButton.Visibility = Visibility.Collapsed;
            Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("InstallingApplicationUpdate"));
            Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ApplicationUpdateRestarting"));
            await _logger.InfoAsync("Starting verified application update helper: " + work);
            await ApplicationUpdateInstaller.StartAsync(work, lifetime.Token);
            Quit();
        }
        catch (OperationCanceledException)
        {
            Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ApplicationUpdateCancelled"));
            Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ApplicationUpdateRetry"));
        }
        catch (Exception exception)
        {
            Localization.Set(UpdateTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ApplicationUpdateFailed"));
            Localization.Set(UpdateDescription, System.Windows.Controls.TextBlock.TextProperty, () => exception is UnauthorizedAccessException
                ? Localization.T("ApplicationUpdateAccessDenied")
                : exception is InvalidOperationException ? Localization.T("ApplicationUpdateOfficialEditionRequired")
                : Localization.T("ApplicationUpdateRetry"));
            await _logger.ErrorAsync("Automatic application update failed.", exception);
        }
        finally
        {
            _updateDownload = null;
            CheckUpdateButton.IsEnabled = true;
            DownloadUpdateButton.IsEnabled = true;
            DownloadUpdateButton.Visibility = Visibility.Visible;
            CancelUpdateButton.Visibility = Visibility.Collapsed;
            UpdateProgress.Visibility = Visibility.Collapsed;
        }
    }

    private void CancelUpdate_Click(object sender, RoutedEventArgs e) => _updateDownload?.Cancel();

    /// <summary>Starts hidden in the notification area, used by the sign-in startup entry.</summary>
    internal bool StartHidden { get; init; }

    public MainWindow()
    {
        InitializeComponent();
        Localization.Set(LanguageButton, System.Windows.Controls.ContentControl.ContentProperty,
            () => Localization.F("LanguageFormat", SupportedLanguages.Get(Localization.Current.Language).NativeName));
        Localization.Current.LanguageChanged += OnLanguageChanged;
        Localization.Set(AboutVersion, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("VersionWindowsXFormat", typeof(MainWindow).Assembly.GetName().Version?.ToString(3)));
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
        _displayChangeTimer.Tick += async (_, _) => await ReconcileDisplayChangesAsync();
        _environmentMonitor.StateChanged += OnEnvironmentStateChanged;
        _trayIcon = new TrayIcon(() => _ = HandleLaunchAsync(new()), () => _ = HandleLaunchAsync(new(ShowScreens: true)), Quit,
            () => _ = RotateAllNowAsync(), () => _rotation.Document.Paused, () => _ = ToggleRotationPauseAsync());
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (StartHidden) Hide();
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
            ShowCurrentPage();
            await _assignmentService.RestoreAsync(discovered.ToDictionary(template => template.Manifest.Id, StringComparer.OrdinalIgnoreCase), template => _settingsStore.LoadAsync(template.Manifest.Id, template.Manifest.Settings.ToDictionary(setting => setting.Id, setting => setting.Default)));
            RefreshScreens();
            RefreshStartupBanner();
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("DisplaySDetectedChooseASceneToApplyFormat", _displaySnapshot.Count));
            if (_assignmentService.RestoreWarnings.Count > 0)
            {
                Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => string.Join(" ", _assignmentService.RestoreWarnings));
                await _logger.InfoAsync("Wallpaper restoration incomplete: " + DisplayStatus.Text);
            }
            await _logger.InfoAsync($"Started with {_templates.Count} local templates.");
            await InitializeRotationAsync();
            _onlineTimer.Tick += async (_, _) => await CheckOnlineAsync(notify: true);
            _onlineTimer.Start();
            _ = CheckOnlineAsync(notify: true);
        }
        catch (Exception exception)
        {
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("GalleryCouldNotBeLoaded"));
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
            if (request.Minimized) { Hide(); return; }
            ShowInTaskbar = true;
            Show();
            if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
            Activate();
            if (request.ShowScreens) { _currentPage = "screens"; ShowScreens(); }
            if (request.ShowOnline) { _currentPage = "online"; ShowOnline(); }
            if (request.PackagePath is not null) await ImportPackageAsync(request.PackagePath);
        }
        finally { _launchGate.Release(); }
    }

    private void Home_Click(object sender, RoutedEventArgs e) { _currentPage = "home"; ShowPage(Localization.T("ChooseYourWallpaper"), Localization.T("ChooseASceneThenSelectTheDisplaysWhereItShouldRun"), _templates); }
    private void Gallery_Click(object sender, RoutedEventArgs e) { _currentPage = "gallery"; ShowPage(Localization.T("Gallery"), Localization.T("BrowseTemplatesInstalledWithSeeWallpaper"), _templates); }
    private void Installed_Click(object sender, RoutedEventArgs e) { _currentPage = "installed"; ShowPage(Localization.T("Installed"), Localization.F("TemplatesAvailableLocallyFormat", _templates.Count), _templates); }
    private void RefreshStartupBanner() => StartupBanner.Visibility = _startup.IsEnabled || _startupBannerDismissed ? Visibility.Collapsed : Visibility.Visible;
    private async void EnableStartup_Click(object sender, RoutedEventArgs e) => await SetStartupAsync(true);
    private void DismissStartup_Click(object sender, RoutedEventArgs e) { _startupBannerDismissed = true; RefreshStartupBanner(); }
    private async Task SetStartupAsync(bool enabled)
    {
        try
        {
            if (enabled) _startup.Enable(Environment.ProcessPath ?? throw new InvalidOperationException(Localization.T("TheAppLocationCouldNotBeDetermined")));
            else _startup.Disable();
            await _logger.InfoAsync($"Sign-in startup {(enabled ? "enabled" : "disabled")}.");
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => enabled ? Localization.T("SeeWallpaperNowStartsWithWindowsAndRestoresYourWallpapers") : Localization.T("SeeWallpaperNoLongerStartsWithWindows"));
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Sign-in startup could not be changed.", exception);
            MessageBox.Show(exception.Message, Localization.T("StartupSetting"), MessageBoxButton.OK, MessageBoxImage.Error);
        }
        RefreshStartupBanner();
    }
    private void Online_Click(object sender, RoutedEventArgs e) { _currentPage = "online"; ShowOnline(); }
    private async void OnlineRefresh_Click(object sender, RoutedEventArgs e) => await CheckOnlineAsync(notify: false);
    private void ShowOnline()
    {
        Localization.Set(PageTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("Online"));
        Localization.Set(PageDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("NewWallpapersPublishedOnTheSeeWallpaperGitHubRepositoryEveryFileIsVerifiedBefore"));
        GalleryView.Visibility = Visibility.Collapsed;
        ScreensView.Visibility = Visibility.Collapsed;
        AboutView.Visibility = Visibility.Collapsed;
        OnlineView.Visibility = Visibility.Visible;
        RotationView.Visibility = Visibility.Collapsed;
        PageActions.Visibility = Visibility.Collapsed;
        DisplayStatus.Visibility = Visibility.Visible;
        OnlineList.ItemsSource = _onlineOffers;
        Localization.Set(OnlineNotice, System.Windows.Controls.TextBlock.TextProperty, () => _onlineNotice());
        OnlineRefreshButton.IsEnabled = !_checkingOnline;
    }

    /// <summary>Fetches the repository's templates and offers the ones that are missing or newer locally.</summary>
    private async Task CheckOnlineAsync(bool notify)
    {
        if (_checkingOnline) return;
        _checkingOnline = true;
        _onlineNotice = () => Localization.T("CheckingGitHubForNewWallpapers");
        if (_currentPage == "online") ShowOnline();
        try
        {
            _onlineCatalog = await _onlineStore.GetTemplatesAsync();
            UpdateOnlineOffers();
            OnlineTemplateCardViewModel[] fresh = _onlineOffers.Where(offer => !offer.IsUpdate && _notifiedOnlineIds.Add(offer.Template.Manifest.Id)).ToArray();
            if (notify && fresh.Length > 0 && !IsVisible)
                _trayIcon.ShowNotification(fresh.Length == 1 ? Localization.F("NewWallpaperFormat", fresh[0].Name) : Localization.F("NewWallpapersAvailableFormat", fresh.Length), Localization.T("ClickToSeeThemInSeeWallpaper"), () => _ = HandleLaunchAsync(new(ShowOnline: true)));
            await _logger.InfoAsync($"Online check: {_onlineCatalog.Count} published, {_onlineOffers.Count} offered.");
        }
        catch (Exception exception)
        {
            _onlineNotice = () => Localization.T("GitHubCouldNotBeReachedCheckYourConnectionAndTryAgain");
            await _logger.ErrorAsync("Online template check failed.", exception);
        }
        finally
        {
            _checkingOnline = false;
            if (_currentPage == "online") ShowOnline();
        }
    }

    private void UpdateOnlineOffers()
    {
        Dictionary<string, SeeWallpaper.Core.TemplateManifest> installed = _templates.ToDictionary(card => card.Template.Manifest.Id, card => card.Template.Manifest, StringComparer.OrdinalIgnoreCase);
        _onlineOffers = _onlineCatalog.Select(template => OnlineTemplateCardViewModel.Offer(template, installed.GetValueOrDefault(template.Manifest.Id))).OfType<OnlineTemplateCardViewModel>().ToArray();
        DateTime lastChecked = DateTime.Now;
        _onlineNotice = () => _onlineOffers.Count == 0 ? Localization.F("YouAlreadyHaveEveryWallpaperPublishedOnlineLastCheckedAtTFormat", lastChecked) : Localization.F("WallpaperSToDownloadLastCheckedAtTFormat", _onlineOffers.Count, lastChecked);
        Localization.Set(OnlineButton, System.Windows.Controls.ContentControl.ContentProperty, () => _onlineOffers.Count == 0 ? Localization.T("Online") : Localization.F("OnlineFormat", _onlineOffers.Count));
    }

    private async void DownloadOnline_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not OnlineTemplateCardViewModel offer) return;
        System.Windows.Controls.Button button = (System.Windows.Controls.Button)sender;
        button.IsEnabled = false;
        Localization.Set(button, System.Windows.Controls.ContentControl.ContentProperty, () => Localization.T("Downloading"));
        Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("DownloadingFormat", offer.Name));
        try
        {
            await _onlineStore.InstallAsync(offer.Template, _templatesRoot);
            await _logger.InfoAsync($"Online template installed: {offer.Template.Manifest.Id} {offer.Template.Manifest.Version}.");
            await RefreshTemplatesAsync();
            UpdateOnlineOffers();
            ShowOnline();
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => offer.IsUpdate ? Localization.F("UpdatedReapplyItToSeeTheNewVersionFormat", offer.Name) : Localization.F("InstalledFindItInTheGalleryFormat", offer.Name));
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Online template download failed.", exception);
            button.IsEnabled = true;
            Localization.Set(button, System.Windows.Controls.ContentControl.ContentProperty, () => offer.ActionLabel);
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("CouldNotBeInstalledFormat", offer.Name));
            string hint = exception is IOException or UnauthorizedAccessException ? Localization.T("IfThisWallpaperIsRunningRemoveItFromYourDisplaysAndTryAgain") : "";
            MessageBox.Show(exception.Message + hint, Localization.T("DownloadFailed"), MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private static HttpClient CreateOnlineHttpClient()
    {
        HttpClient client = new() { Timeout = TimeSpan.FromSeconds(30) };
        // GitHub's API rejects requests without a User-Agent.
        client.DefaultRequestHeaders.UserAgent.ParseAdd($"seeWallpaper/{typeof(MainWindow).Assembly.GetName().Version?.ToString(3) ?? "1.0"}");
        return client;
    }

    private void Favorites_Click(object sender, RoutedEventArgs e) { _currentPage = "favorites"; ShowPage(Localization.T("Favorites"), Localization.T("YourSavedScenes"), _templates.Where(template => template.IsFavorite).ToArray()); }
    private void Create_Click(object sender, RoutedEventArgs e) { _currentPage = "create"; ShowPage(Localization.T("Create"), Localization.T("TheVisualTemplateEditorIsPlannedAfterTheEngineAndSDKAreStable"), Array.Empty<TemplateCardViewModel>()); }
    private async void Settings_Click(object sender, RoutedEventArgs e)
    {
        bool startupEnabled = _startup.IsEnabled;
        PerformanceSettingsWindow dialog = new(_performanceProfile, _pauseOnFullscreen, _pauseOnBattery, startupEnabled) { Owner = this };
        if (dialog.ShowDialog() != true) return;
        if (dialog.StartWithWindows != startupEnabled) await SetStartupAsync(dialog.StartWithWindows);
        _performanceProfile = dialog.SelectedProfile;
        _pauseOnFullscreen = dialog.PauseOnFullscreen;
        _pauseOnBattery = dialog.PauseOnBattery;
        await _performanceSettingsStore.SaveAsync(new PerformanceSettings(_performanceProfile.ToString(), _pauseOnFullscreen, _pauseOnBattery));
        await _wallpaperHost.SetPerformanceProfileAsync(_performanceProfile);
        await ApplyPauseStateAsync();
        Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("PerformanceFormat", Localization.T(_performanceProfile.ToString())));
        await _logger.InfoAsync($"Performance profile changed to {_performanceProfile}.");
    }
    private async void Preview_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
        WallpaperPreviewWindow preview = new(template.Template, settings) { Owner = this };
        Localization.Set(preview, TitleProperty, () => Localization.F("PreviewFormat", template.Name));
        preview.Show();
    }

    private async void Customize_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
        WallpaperPreviewWindow preview = new(template.Template, settings) { Owner = this };
        Localization.Set(preview, TitleProperty, () => Localization.F("PreviewFormat", template.Name));
        preview.Show();
        new TemplateSettingsWindow(template.Template, preview, _settingsStore, settings,
            values => _wallpaperHost.UpdateTemplateSettingsAsync(template.Template.Manifest.Id, values)).Show();
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
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("ApplyingFormat", template.Name));
            IReadOnlyDictionary<string, object?> settings = await LoadSettingsAsync(template);
            switch (dialog.SelectedMode)
            {
                case WallpaperApplicationMode.Clone:
                    await _assignmentService.ApplyGlobalAsync(template.Template, settings, WallpaperAssignmentMode.Clone);
                    Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("AppliedToAllDisplaysFormat", template.Name));
                    break;
                case WallpaperApplicationMode.Span:
                    await _assignmentService.ApplyGlobalAsync(template.Template, settings, WallpaperAssignmentMode.Span);
                    Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("SpanningAllDisplaysFormat", template.Name));
                    break;
                default:
                    foreach (SeeWallpaper.Platform.DisplayInfo display in dialog.SelectedDisplays)
                    {
                        await _assignmentService.ApplyAsync(template.Template, display, settings);
                        completed.Add(DisplayTitle(display));
                    }
                    Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("AppliedToSelectedDisplaysFormat", template.Name, string.Join(", ", completed)));
                    break;
            }
            await _logger.InfoAsync($"Wallpaper applied: {template.Template.Manifest.Id}.");
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Wallpaper application failed.", exception);
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => completed.Count > 0 ? Localization.F("PartiallyAppliedFormat", string.Join(", ", completed), exception.Message) : Localization.F("ApplicationInterruptedFormat", exception.Message));
            MessageBox.Show(DisplayStatus.Text, Localization.T("ApplyWallpaper"), MessageBoxButton.OK, MessageBoxImage.Error);
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
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("ImportedFormat", imported.Manifest.Name));
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template import failed.", exception);
            MessageBox.Show(exception.Message, Localization.T("ImportFailed"), MessageBoxButton.OK, MessageBoxImage.Error);
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
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("ExportedFormat", Path.GetFileName(dialog.FileName)));
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template export failed.", exception);
            MessageBox.Show(exception.Message, Localization.T("ExportFailed"), MessageBoxButton.OK, MessageBoxImage.Error);
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
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("DuplicatedFormat", duplicate.Manifest.Name));
            ShowCurrentPage();
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template duplication failed.", exception);
            MessageBox.Show(exception.Message, Localization.T("DuplicateFailed"), MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void Uninstall_Click(object sender, RoutedEventArgs e)
    {
        if (((FrameworkElement)sender).Tag is not TemplateCardViewModel template) return;
        if (MessageBox.Show(Localization.F("UninstallFormat", template.Name), Localization.T("ConfirmUninstall"), MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes) return;
        try
        {
            await _libraryService.UninstallAsync(template.Template, _templatesRoot);
            _favoriteTemplateIds.Remove(template.Template.Manifest.Id);
            await _favoritesStore.SaveAsync(_favoriteTemplateIds);
            await _logger.InfoAsync($"Template uninstalled: {template.Template.Manifest.Id}.");
            await RefreshTemplatesAsync();
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("UninstalledFormat", template.Name));
            ShowCurrentPage();
        }
        catch (Exception exception)
        {
            await _logger.ErrorAsync("Template uninstall failed.", exception);
            MessageBox.Show(exception.Message, Localization.T("UninstallFailed"), MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
    private void ShowPage(string title, string description, IReadOnlyList<TemplateCardViewModel> templates) { GalleryView.Visibility = Visibility.Visible; ScreensView.Visibility = Visibility.Collapsed; OnlineView.Visibility = Visibility.Collapsed; AboutView.Visibility = Visibility.Collapsed; RotationView.Visibility = Visibility.Collapsed; PageActions.Visibility = Visibility.Visible; DisplayStatus.Visibility = Visibility.Visible; Localization.Set(PageTitle, System.Windows.Controls.TextBlock.TextProperty, () => title); Localization.Set(PageDescription, System.Windows.Controls.TextBlock.TextProperty, () => description); _galleryTemplates = templates; ApplyGallerySearch(); }
    private void GallerySearch_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
    {
        // TextChanged can run while InitializeComponent is still creating controls.
        if (TemplateList is not null && ClearGallerySearch is not null && GallerySearchEmpty is not null)
            ApplyGallerySearch();
    }

    private void ApplyGallerySearch()
    {
        string query = GallerySearch.Text.Trim();
        var matches = _galleryTemplates.Where(template => GallerySearchFilter.Matches(template.Name, query)).ToArray();
        TemplateList.ItemsSource = matches;
        ClearGallerySearch.IsEnabled = GallerySearch.Text.Length > 0;
        GallerySearchEmpty.Visibility = query.Length > 0 && matches.Length == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private void ClearGallerySearch_Click(object sender, RoutedEventArgs e)
    {
        GallerySearch.Clear();
        GallerySearch.Focus();
    }

    private void About_Click(object sender, RoutedEventArgs e) { _currentPage = "about"; ShowAbout(); }
    private void ShowAbout()
    {
        Localization.Set(PageTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("About"));
        Localization.Set(PageDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("TheCreatorAvailableFeaturesAndWaysToGetStarted"));
        GalleryView.Visibility = Visibility.Collapsed;
        ScreensView.Visibility = Visibility.Collapsed;
        OnlineView.Visibility = Visibility.Collapsed;
        AboutView.Visibility = Visibility.Visible;
        RotationView.Visibility = Visibility.Collapsed;
        PageActions.Visibility = Visibility.Collapsed;
        DisplayStatus.Visibility = Visibility.Collapsed;
    }
    /// <summary>Closing the window only hides it so wallpapers keep running; use <see cref="Quit"/> to stop them.</summary>
    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        if (!_quitting)
        {
            e.Cancel = true;
            Hide();
            _trayIcon.ShowStillRunningHint();
        }
        base.OnClosing(e);
    }
    private void Quit() { _quitting = true; _updateDownload?.Cancel(); _displayChangeLifetime.Cancel(); Close(); }
    protected override async void OnClosed(EventArgs e) { Localization.Current.LanguageChanged -= OnLanguageChanged; _displayChangeTimer.Stop(); _onlineTimer.Stop(); _rotationTimer.Stop(); _trayIcon.Dispose(); SystemEvents.SessionSwitch -= OnSessionSwitch; SystemEvents.DisplaySettingsChanged -= OnDisplaySettingsChanged; _environmentMonitor.StateChanged -= OnEnvironmentStateChanged; _environmentMonitor.Dispose(); await _wallpaperHost.DisposeAsync(); base.OnClosed(e); }
    private static IReadOnlyDictionary<string, object?> CreateDefaultSettings(TemplateCardViewModel template) => template.Template.Manifest.Settings.ToDictionary(setting => setting.Id, setting => setting.Default);
    private Task<IReadOnlyDictionary<string, object?>> LoadSettingsAsync(TemplateCardViewModel template) => _settingsStore.LoadAsync(template.Template.Manifest.Id, CreateDefaultSettings(template));
    private async Task RefreshTemplatesAsync()
    {
        IReadOnlyList<SeeWallpaper.Core.InstalledTemplate> discovered = await _catalog.DiscoverAsync(_templatesRoot);
        Brush[] visuals = [new LinearGradientBrush(Color.FromRgb(0, 28, 17), Color.FromRgb(0, 160, 94), 25), new LinearGradientBrush(Color.FromRgb(23, 14, 46), Color.FromRgb(173, 71, 121), 35), new LinearGradientBrush(Color.FromRgb(8, 27, 54), Color.FromRgb(82, 67, 218), 45)];
        _templates = discovered.Select((template, index) => new TemplateCardViewModel(template, visuals[index % visuals.Length], _favoriteTemplateIds.Contains(template.Manifest.Id))).ToArray();
        ShowCurrentPage();
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
    private Task ApplyPauseStateAsync() => _wallpaperHost.SetPausedAsync(IsPausedByEnvironment);
    private void ShowCurrentPage()
    {
        if (_currentPage == "create") { ShowPage(Localization.T("Create"), Localization.T("TheVisualTemplateEditorIsPlannedAfterTheEngineAndSDKAreStable"), []); return; }
        if (_currentPage == "favorites") ShowPage(Localization.T("Favorites"), Localization.T("YourSavedScenes"), _templates.Where(template => template.IsFavorite).ToArray());
        else if (_currentPage == "installed") ShowPage(Localization.T("Installed"), Localization.F("TemplatesAvailableLocallyFormat", _templates.Count), _templates);
        else if (_currentPage == "gallery") ShowPage(Localization.T("Gallery"), Localization.T("BrowseTemplatesInstalledWithSeeWallpaper"), _templates);
        else if (_currentPage == "screens") ShowScreens();
        else if (_currentPage == "about") ShowAbout();
        else if (_currentPage == "online") ShowOnline();
        else if (_currentPage == "rotation") ShowRotation();
        else ShowPage(Localization.T("ChooseYourWallpaper"), Localization.T("ChooseASceneThenSelectTheDisplaysWhereItShouldRun"), _templates);
    }

    private void Screens_Click(object sender, RoutedEventArgs e) { _currentPage = "screens"; ShowScreens(); }
    private void ShowScreens()
    {
        Localization.Set(PageTitle, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("MyDisplays"));
        Localization.Set(PageDescription, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("ChooseAWallpaperForEachDisplayThenClickApplyToThisDisplay"));
        GalleryView.Visibility = Visibility.Collapsed;
        ScreensView.Visibility = Visibility.Visible;
        RotationView.Visibility = Visibility.Collapsed;
        OnlineView.Visibility = Visibility.Collapsed;
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
            string scene = active ? Localization.F("ActiveFormat", template?.Name ?? templateId) + (span ? Localization.T("Spanning") : "")
                : templateId is null ? Localization.T("NoWallpaperAppliedToThisDisplay") : Localization.F("SavedChoiceInactiveFormat", template?.Name ?? templateId);
            return new DisplayCardViewModel(display, index + 1, scene, _templates, templateId, active, span);
        }).ToArray();
    }

    private void RefreshScreens()
    {
        _displaySnapshot = _displayManager.GetDisplays().OrderBy(display => display.Id, StringComparer.OrdinalIgnoreCase).ToArray();
        DisplayList.ItemsSource = CreateDisplayCards();
        WallpaperAssignmentsDocument state = _assignmentService.State;
        int disconnected = state.Assignments.Count(saved => !_displaySnapshot.Any(display => string.Equals(display.AssignmentKey, saved.DisplayKey, StringComparison.OrdinalIgnoreCase)));
        Localization.Set(ScreenNotice, System.Windows.Controls.TextBlock.TextProperty, () => _displaySnapshot.Count == 0 ? Localization.T("NoDisplaysDetectedConnectADisplayThenClickRefresh")
            : state.Mode == WallpaperAssignmentMode.Span ? Localization.T("SpanModeApplyingToOneDisplayRestoresIndependentModeOtherDisplaysReceiveThePrevio")
            : disconnected > 0 ? Localization.F("AssignmentSRetainedForDisconnectedDisplaysFormat", disconnected)
            : Localization.T("ApplyingReplacesOnlyTheChosenDisplaySWallpaperYourChoicesAreSavedAutomatically"));
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
                Child = new System.Windows.Controls.Viewbox { Child = new System.Windows.Controls.TextBlock { Text = Localization.F("DisplayFormat", card.Number), Foreground = Brushes.White, Margin = new Thickness(12) } }
            };
            System.Windows.Controls.Canvas.SetLeft(monitor, (card.Display.X - left) * scale);
            System.Windows.Controls.Canvas.SetTop(monitor, (card.Display.Y - top) * scale);
            DisplayLayout.Children.Add(monitor);
        }
    }

    private string DisplayTitle(SeeWallpaper.Platform.DisplayInfo display)
    {
        int index = _displaySnapshot.ToList().FindIndex(item => item.Id == display.Id);
        return index < 0 ? display.Label : Localization.F("DisplayFormat", index + 1);
    }

    private void Identify_Click(object sender, RoutedEventArgs e) => IdentifyDisplays();
    private void IdentifyDisplays()
    {
        foreach ((SeeWallpaper.Platform.DisplayInfo display, int index) in _displaySnapshot.Select((display, index) => (display, index)))
            new DisplayIdentificationWindow(display, index + 1) { Owner = this }.Show();
    }
    private async void RefreshScreens_Click(object sender, RoutedEventArgs e) => await ReconcileDisplayChangesAsync();
    private void OnDisplaySettingsChanged(object? sender, EventArgs e) => _ = Dispatcher.InvokeAsync(() =>
    {
        if (_quitting) return;
        _displayChangeTimer.Stop();
        _displayChangeTimer.Start();
    });

    private async Task ReconcileDisplayChangesAsync()
    {
        _displayChangeTimer.Stop();
        if (_quitting) return;
        if (!_initialized.Task.IsCompleted || _changingWallpapers) { _displayChangeTimer.Start(); return; }
        _changingWallpapers = true;
        SetWallpaperControlsEnabled(false);
        try
        {
            IReadOnlyList<string> errors = await _assignmentService.ReconcileDisplaysAsync(_displayChangeLifetime.Token);
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => errors.Count == 0 ? Localization.T("DisplaysUpdatedSavedWallpapersRestoredWhereAvailable") : string.Join(" ", errors));
            await _logger.InfoAsync(errors.Count == 0 ? "Display topology reconciled." : "Display reconciliation incomplete: " + string.Join("; ", errors));
        }
        catch (OperationCanceledException) when (_quitting) { }
        catch (Exception exception)
        {
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.T("CouldNotRestoreWallpapersAfterADisplayChangeRefreshDisplaysToRetry"));
            await _logger.ErrorAsync("Display reconciliation failed.", exception);
        }
        finally { _changingWallpapers = false; SetWallpaperControlsEnabled(true); RefreshScreens(); }
    }
    private void SetWallpaperControlsEnabled(bool enabled) { GalleryView.IsEnabled = enabled; DisplayList.IsEnabled = enabled; }

    private async void ApplyToScreen_Click(object sender, RoutedEventArgs e)
    {
        if (_changingWallpapers || ((FrameworkElement)sender).Tag is not DisplayCardViewModel card) return;
        if (card.SelectedTemplate is null) { Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("ChooseAWallpaperForFormat", card.Title)); return; }
        TemplateCardViewModel selected = card.SelectedTemplate;
        _changingWallpapers = true;
        SetWallpaperControlsEnabled(false);
        try
        {
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("ApplyingToFormat", selected.Name, card.Title));
            await _assignmentService.ApplyAsync(selected.Template, card.Display, await LoadSettingsAsync(selected));
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("AppliedToFormat", selected.Name, card.Title));
            await _logger.InfoAsync($"Wallpaper {selected.Template.Manifest.Id} applied to {card.Display.Id}.");
        }
        catch (Exception exception)
        {
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => $"{card.Title} : {exception.Message}");
            await _logger.ErrorAsync("Display wallpaper application failed.", exception);
            MessageBox.Show(exception.Message, Localization.F("ApplyToFormat", card.Title), MessageBoxButton.OK, MessageBoxImage.Error);
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
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => Localization.F("WallpaperRemovedFromFormat", card.Title));
            await _logger.InfoAsync($"Wallpaper removed from {card.Display.Id}.");
        }
        catch (Exception exception)
        {
            Localization.Set(DisplayStatus, System.Windows.Controls.TextBlock.TextProperty, () => $"{card.Title} : {exception.Message}");
            await _logger.ErrorAsync("Display wallpaper removal failed.", exception);
            MessageBox.Show(exception.Message, Localization.T("RemoveWallpaper"), MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { _changingWallpapers = false; SetWallpaperControlsEnabled(true); RefreshScreens(); }
    }
}
