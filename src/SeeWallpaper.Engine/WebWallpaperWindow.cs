using System.Text.Json;
using System.IO;
using System.Windows;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using SeeWallpaper.Core;
using SeeWallpaper.Engine.Windows;
using SeeWallpaper.Platform;

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
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;
    private readonly WindowsSystemMetricsService _metricsService = new();
    private readonly DispatcherTimer _metricsTimer = new() { Interval = TimeSpan.FromSeconds(2) };
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
            _metricsTimer.Stop();
            _lifetime.Cancel();
            _isWebViewReady = false;
            _webView.Dispose();
            _ready.TrySetException(new InvalidOperationException($"Wallpaper '{_template.Manifest.Name}' closed before it was ready."));
        };
        _metricsTimer.Tick += async (_, _) =>
        {
            try { if (_isWebViewReady) await PushSystemInfoAsync(); }
            catch (Exception) when (_lifetime.IsCancellationRequested) { }
        };
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            CoreWebView2Environment environment = await WebViewEnvironmentProvider.GetAsync(_template.Manifest.Id);
            _lifetime.Token.ThrowIfCancellationRequested();
            await _webView.EnsureCoreWebView2Async(environment);
            _lifetime.Token.ThrowIfCancellationRequested();
            _isWebViewReady = true;
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.seeWallpaper={getSettings:()=>window.__seeWallpaperSettings||{},getSystemInfo:()=>window.__seeWallpaperSystemInfo||{},onSettingsChanged:(callback)=>window.__seeWallpaperSettingsChanged=callback,onSystemInfoChanged:(callback)=>window.__seeWallpaperSystemInfoChanged=callback,onPause:(callback)=>window.__seeWallpaperPaused=callback,onResume:(callback)=>window.__seeWallpaperResumed=callback,onPerformanceChanged:(callback)=>window.__seeWallpaperPerformanceChanged=callback};");
            TaskCompletionSource navigation = new(TaskCreationOptions.RunContinuationsAsynchronously);
            _webView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                if (args.IsSuccess) navigation.TrySetResult();
                else navigation.TrySetException(new InvalidOperationException($"Navigation failed for '{_template.Manifest.Name}'."));
            };
            _webView.CoreWebView2.Navigate(new Uri(Path.Combine(_template.RootPath, _template.Manifest.Entry)).AbsoluteUri);
            await navigation.Task.WaitAsync(TimeSpan.FromSeconds(30), _lifetime.Token);
            await PushSettingsAsync();
            await PushSystemInfoAsync();
            await PushPerformanceAsync();
            await SetPausedAsync(_isPaused);
            if (_attachToDesktop)
            {
                IntPtr handle = new System.Windows.Interop.WindowInteropHelper(this).Handle;
                DesktopSurface.AttachBehindDesktopIcons(handle, _desktopBounds ?? new WallpaperBounds(0, 0, (int)SystemParameters.PrimaryScreenWidth, (int)SystemParameters.PrimaryScreenHeight));
            }
            _metricsTimer.Start();
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
        return _webView.CoreWebView2.ExecuteScriptAsync($"window.__seeWallpaperSettings={settings};window.__seeWallpaperSettingsChanged?.(window.__seeWallpaperSettings);");
    }

    public async Task UpdateSettingsAsync(IReadOnlyDictionary<string, object?> settings)
    {
        _settings.Clear();
        foreach ((string key, object? value) in settings) _settings[key] = value;
        if (_isWebViewReady) await PushSettingsAsync();
    }

    public async Task SetPausedAsync(bool isPaused)
    {
        _isPaused = isPaused;
        if (_isWebViewReady) await _webView.CoreWebView2.ExecuteScriptAsync(isPaused ? "window.__seeWallpaperPaused?.();" : "window.__seeWallpaperResumed?.();");
    }

    public async Task SetPerformanceProfileAsync(WallpaperPerformanceProfile profile)
    {
        _performanceProfile = profile;
        if (_isWebViewReady) await PushPerformanceAsync();
    }

    private Task PushPerformanceAsync() => _webView.CoreWebView2.ExecuteScriptAsync($"window.__seeWallpaperPerformanceChanged?.({WallpaperPerformanceProfiles.GetTargetFramesPerSecond(_performanceProfile)});");
    private Task PushSystemInfoAsync()
    {
        string metrics = JsonSerializer.Serialize(_metricsService.GetSnapshot(), new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        return _webView.CoreWebView2.ExecuteScriptAsync($"window.__seeWallpaperSystemInfo={metrics};window.__seeWallpaperSystemInfoChanged?.(window.__seeWallpaperSystemInfo);");
    }
}
