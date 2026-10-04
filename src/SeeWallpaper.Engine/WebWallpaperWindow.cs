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
    private WallpaperPerformanceProfile _performanceProfile = WallpaperPerformanceProfile.Balanced;

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
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            string userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "seeWallpaper", "webview", _template.Manifest.Id);
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await _webView.EnsureCoreWebView2Async(environment);
            _isWebViewReady = true;
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("window.seeWallpaper={getSettings:()=>window.__seeWallpaperSettings||{},getSystemInfo:()=>({}),onSettingsChanged:(callback)=>window.__seeWallpaperSettingsChanged=callback,onPause:(callback)=>window.__seeWallpaperPaused=callback,onResume:(callback)=>window.__seeWallpaperResumed=callback,onPerformanceChanged:(callback)=>window.__seeWallpaperPerformanceChanged=callback};");
            _webView.CoreWebView2.NavigationCompleted += async (_, args) => { if (args.IsSuccess) await PushSettingsAsync(); };
            _webView.CoreWebView2.Navigate(new Uri(Path.Combine(_template.RootPath, _template.Manifest.Entry)).AbsoluteUri);
            if (_attachToDesktop)
            {
                IntPtr handle = new System.Windows.Interop.WindowInteropHelper(this).Handle;
                DesktopSurface.AttachBehindDesktopIcons(handle, _desktopBounds ?? new WallpaperBounds(0, 0, (int)SystemParameters.PrimaryScreenWidth, (int)SystemParameters.PrimaryScreenHeight));
            }
        }
        catch (Exception exception)
        {
            System.Windows.MessageBox.Show($"Unable to load {_template.Manifest.Name}.{Environment.NewLine}{exception.Message}", "seeWallpaper", MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }

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
}
