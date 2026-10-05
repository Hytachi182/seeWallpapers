using System.Text.Json;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using SeeWallpaper.Core;
using SeeWallpaper.Engine.Windows;

namespace SeeWallpaper.Engine;

public class WebWallpaperWindow : Window
{
    private readonly InstalledTemplate _template;
    private readonly Dictionary<string, object?> _settings;
    private readonly bool _attachToDesktop;
    private readonly WallpaperBounds? _desktopBounds;
    private readonly WebView2 _webView = new();
    private bool _isWebViewReady;
    private bool _isPaused;
    private bool _isOccluded;
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private readonly SharedSystemMetricsSource _metricsSource = SharedSystemMetricsSource.Current;
    private bool _usesSystemInfo;
    private bool _documentReady;
    private bool _metricsSubscribed;
    private bool? _sentPauseState;
    private WallpaperPerformanceProfile? _sentPerformanceProfile;
    private readonly TaskCompletionSource _ready = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly CancellationTokenSource _lifetime = new();

    public WebWallpaperWindow(InstalledTemplate template, IReadOnlyDictionary<string, object?> settings, bool attachToDesktop, WallpaperBounds? desktopBounds = null)
    {
        _template = template;
        _settings = new Dictionary<string, object?>(settings);
        _attachToDesktop = attachToDesktop;
        _desktopBounds = desktopBounds;
        Content = _webView;
        WindowStyle = WindowStyle.None;
        ResizeMode = ResizeMode.NoResize;
        ShowInTaskbar = !attachToDesktop;
        Background = System.Windows.Media.Brushes.Black;
        Loaded += OnLoaded;
        Closed += (_, _) =>
        {
            _metricsSource.Unsubscribe(OnSystemMetrics);
            _lifetime.Cancel();
            _isWebViewReady = false;
            _webView.Dispose();
            _ready.TrySetException(new InvalidOperationException($"Wallpaper '{_template.Manifest.Name}' closed before it was ready."));
        };
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            CoreWebView2Environment environment = await WebViewEnvironmentProvider.GetAsync();
            _lifetime.Token.ThrowIfCancellationRequested();
            await _webView.EnsureCoreWebView2Async(environment);
            _lifetime.Token.ThrowIfCancellationRequested();
            _isWebViewReady = true;
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("(()=>{let systemInfoRequested=false;const requestSystemInfo=()=>{if(!systemInfoRequested){window.chrome.webview.postMessage('seeWallpaper:system-info');systemInfoRequested=true;}};window.seeWallpaper={getSettings:()=>window.__seeWallpaperSettings||{},getSystemInfo:()=>{requestSystemInfo();return window.__seeWallpaperSystemInfo||{};},onSettingsChanged:(callback)=>window.__seeWallpaperSettingsChanged=callback,onSystemInfoChanged:(callback)=>{window.__seeWallpaperSystemInfoChanged=callback;requestSystemInfo();},onPause:(callback)=>window.__seeWallpaperPaused=callback,onResume:(callback)=>window.__seeWallpaperResumed=callback,onPerformanceChanged:(callback)=>window.__seeWallpaperPerformanceChanged=callback};})();");
            using (Stream stream = typeof(WebWallpaperWindow).Assembly.GetManifestResourceStream("SeeWallpaper.Engine.SystemMetricsOverlay.js")!)
            using (StreamReader reader = new(stream))
                await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(await reader.ReadToEndAsync());
            TaskCompletionSource navigation = new(TaskCreationOptions.RunContinuationsAsynchronously);
            _webView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                if (args.IsSuccess) navigation.TrySetResult();
                else navigation.TrySetException(new InvalidOperationException($"Navigation failed for '{_template.Manifest.Name}'."));
            };
            _webView.CoreWebView2.Navigate(new Uri(Path.Combine(_template.RootPath, _template.Manifest.Entry)).AbsoluteUri);
            await navigation.Task.WaitAsync(TimeSpan.FromSeconds(30), _lifetime.Token);
            _documentReady = true;
            await PushSettingsAsync();
            await EnsureSystemInfoSubscriptionAsync();
            await PushPerformanceAsync();
            await ApplyPauseStateAsync();
            if (_attachToDesktop)
            {
                IntPtr handle = new System.Windows.Interop.WindowInteropHelper(this).Handle;
                DesktopSurface.AttachBehindDesktopIcons(handle, _desktopBounds ?? new WallpaperBounds(0, 0, (int)SystemParameters.PrimaryScreenWidth, (int)SystemParameters.PrimaryScreenHeight));
            }
            _ready.TrySetResult();
        }
        catch (Exception exception)
        {
            _ready.TrySetException(exception);
            Close();
        }
    }

    public Task WaitUntilReadyAsync(CancellationToken cancellationToken = default) => _ready.Task.WaitAsync(cancellationToken);

    private Task PushSettingsAsync()
    {
        string settings = JsonSerializer.Serialize(_settings);
        return _webView.CoreWebView2.ExecuteScriptAsync($"window.__seeWallpaperSettings={settings};window.__seeWallpaperMetricsOverlay?.settings(window.__seeWallpaperSettings);window.__seeWallpaperSettingsChanged?.(window.__seeWallpaperSettings);");
    }

    public async Task UpdateSettingsAsync(IReadOnlyDictionary<string, object?> settings)
    {
        _settings.Clear();
        foreach ((string key, object? value) in settings) _settings[key] = value;
        if (_documentReady && _isWebViewReady)
        {
            await PushSettingsAsync();
            await EnsureSystemInfoSubscriptionAsync();
        }
    }

    public Task SetPausedAsync(bool isPaused)
    {
        _isPaused = isPaused;
        return ApplyPauseStateAsync();
    }

    /// <summary>Pauses rendering while application windows completely hide this wallpaper.</summary>
    internal Task SetOccludedAsync(bool isOccluded)
    {
        _isOccluded = isOccluded;
        return ApplyPauseStateAsync();
    }

    internal bool IsAttachedToDesktop => _attachToDesktop && _ready.Task.IsCompletedSuccessfully;
    internal string TemplateId => _template.Manifest.Id;

    internal IntPtr Handle => new System.Windows.Interop.WindowInteropHelper(this).Handle;

    private async Task ApplyPauseStateAsync()
    {
        bool isPaused = _isPaused || _isOccluded;
        if (_documentReady && _isWebViewReady && _sentPauseState != isPaused)
        {
            _sentPauseState = isPaused;
            await _webView.CoreWebView2.ExecuteScriptAsync(isPaused ? "window.__seeWallpaperPaused?.();" : "window.__seeWallpaperResumed?.();");
        }
    }

    public async Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile)
    {
        _performanceProfile = profile;
        if (_documentReady && _isWebViewReady) await PushPerformanceAsync();
    }

    private async Task PushPerformanceAsync()
    {
        WallpaperPerformanceProfile profile = _performanceProfile;
        if (_sentPerformanceProfile == profile) return;
        await _webView.CoreWebView2.ExecuteScriptAsync($"window.__seeWallpaperPerformanceChanged?.({WallpaperPerformanceProfiles.GetTargetFramesPerSecond(profile)});");
        _sentPerformanceProfile = profile;
    }

    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        // Other template messages are not part of the metrics subscription protocol.
        if (args.WebMessageAsJson != "\"seeWallpaper:system-info\"") return;
        _usesSystemInfo = true;
        try { await EnsureSystemInfoSubscriptionAsync(); }
        catch (Exception exception) { ReportMetricsError(exception); }
    }

    private async Task EnsureSystemInfoSubscriptionAsync()
    {
        bool overlayEnabled = _settings.TryGetValue("__seeMetricsEnabled", out object? enabled) &&
            (enabled is true || enabled is JsonElement { ValueKind: JsonValueKind.True });
        if (!_documentReady || !_isWebViewReady) return;
        if (!_usesSystemInfo && !overlayEnabled)
        {
            if (_metricsSubscribed) _metricsSource.Unsubscribe(OnSystemMetrics);
            _metricsSubscribed = false;
            return;
        }
        if (_metricsSubscribed) return;
        _metricsSubscribed = true;
        _metricsSource.Subscribe(OnSystemMetrics);
        await PushSystemInfoAsync(_metricsSource.GetSnapshotJson());
    }

    private async void OnSystemMetrics(string metrics)
    {
        if (!_isWebViewReady) return;
        try { await PushSystemInfoAsync(metrics); }
        catch (Exception exception) { ReportMetricsError(exception); }
    }

    private void ReportMetricsError(Exception exception)
    {
        if (!_lifetime.IsCancellationRequested)
            System.Diagnostics.Trace.TraceError($"System metrics for '{_template.Manifest.Id}': {exception}");
    }

    private Task PushSystemInfoAsync(string metrics)
    {
        return _webView.CoreWebView2.ExecuteScriptAsync($"window.__seeWallpaperSystemInfo={metrics};window.__seeWallpaperMetricsOverlay?.metrics(window.__seeWallpaperSystemInfo);window.__seeWallpaperSystemInfoChanged?.(window.__seeWallpaperSystemInfo);");
    }
}
