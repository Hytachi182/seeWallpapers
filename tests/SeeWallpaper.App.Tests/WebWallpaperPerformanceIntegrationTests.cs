using System.IO;
using System.Text.Json;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Wpf;
using SeeWallpaper.Core;
using SeeWallpaper.Engine;
using SeeWallpaper.App;
using SeeWallpaper.Infrastructure;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Core;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class WebWallpaperPerformanceIntegrationTests
{
    [WebViewIntegrationFact]
    public void Real_webviews_preserve_initialization_transitions_and_dynamic_metrics_consumers()
    {
        Exception? failure = null;
        Thread thread = new(() =>
        {
            Application application = new() { ShutdownMode = ShutdownMode.OnExplicitShutdown };
            application.Resources["Canvas"] = new SolidColorBrush(Color.FromRgb(16, 18, 26));
            application.Resources["Muted"] = new SolidColorBrush(Color.FromRgb(174, 183, 201));
            Dispatcher dispatcher = Dispatcher.CurrentDispatcher;
            dispatcher.BeginInvoke(new Action(async () =>
            {
                try { await VerifyAsync(); }
                catch (Exception exception) { failure = exception; }
                finally { application.Shutdown(); dispatcher.BeginInvokeShutdown(DispatcherPriority.Normal); }
            }));
            Dispatcher.Run();
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(90)), "WebView2 performance checks timed out.");
        if (failure is not null) System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(failure).Throw();
    }

    private static async Task VerifyAsync()
    {
        string root = Path.Combine(Path.GetTempPath(), "seeWallpaper-performance-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        List<WebWallpaperWindow> windows = [];
        try
        {
            await File.WriteAllTextAsync(Path.Combine(root, "index.html"), """
                <!doctype html><html><body><script>
                window.calls={pause:0,resume:0,performance:0,metrics:0};
                seeWallpaper.onPause(()=>calls.pause++);
                seeWallpaper.onResume(()=>calls.resume++);
                seeWallpaper.onPerformanceChanged(fps=>{calls.performance++;window.fps=fps;});
                window.subscribe=()=>seeWallpaper.onSystemInfoChanged(value=>{calls.metrics++;window.metrics=value;});
                </script></body></html>
                """);
            InstalledTemplate template = new(new TemplateManifest(1, "performance-check", "Performance check", "test", "tests", "1.0", "test", "web", "index.html", "preview.png", "low", []), root, 0);
            for (int index = 0; index < 2; index++)
            {
                WebWallpaperWindow window = new(template, new Dictionary<string, object?>(), false) { Width = 320, Height = 180 };
                windows.Add(window);
                if (index == 0) await window.SetPausedAsync(true); // State set before readiness must still be delivered.
                window.Show();
                await window.WaitUntilReadyAsync().WaitAsync(TimeSpan.FromSeconds(35));
            }
            WebWallpaperWindow first = windows[0], second = windows[1];
            // Also exercise scenes which request metrics while the document is loading.
            string startupHtml = (await File.ReadAllTextAsync(Path.Combine(root, "index.html")))
                .Replace("</script>", "subscribe();</script>");
            await File.WriteAllTextAsync(Path.Combine(root, "startup.html"), startupHtml);
            WebWallpaperWindow startup = new(template with { Manifest = template.Manifest with { Entry = "startup.html" } }, new Dictionary<string, object?>(), false) { Width = 320, Height = 180 };
            windows.Add(startup);
            startup.Show();
            await startup.WaitUntilReadyAsync().WaitAsync(TimeSpan.FromSeconds(35));
            await WaitFor(startup, "calls.metrics > 0");
            Assert.Equal("30", await Evaluate(first, "window.fps"));
            Assert.Equal("1", await Evaluate(first, "calls.pause"));
            Assert.Equal("1", await Evaluate(second, "calls.resume"));
            await first.SetPausedAsync(true);
            await first.SetPerformanceProfileAsync(WallpaperPerformanceProfile.Balanced);
            Assert.Equal("1", await Evaluate(first, "calls.pause"));
            Assert.Equal("1", await Evaluate(first, "calls.performance"));
            await first.SetPausedAsync(false);
            await first.SetPausedAsync(false);
            await first.SetPerformanceProfileAsync(WallpaperPerformanceProfile.High);
            await first.SetPerformanceProfileAsync(WallpaperPerformanceProfile.High);
            Assert.Equal("1", await Evaluate(first, "calls.resume"));
            Assert.Equal("2", await Evaluate(first, "calls.performance"));
            Assert.Equal("60", await Evaluate(first, "window.fps"));

            await Task.Delay(2300);
            Assert.Equal("false", await Evaluate(first, "!!window.__seeWallpaperSystemInfo"));
            Assert.Equal("0", await Evaluate(first, "calls.metrics"));
            foreach (WebWallpaperWindow window in windows.Take(2)) await Evaluate(window, "subscribe()");
            await WaitFor(first, "calls.metrics > 0");
            await WaitFor(second, "calls.metrics > 0");
            Assert.Equal(await Evaluate(first, "metrics.timestamp"), await Evaluate(second, "metrics.timestamp"));
            Assert.Equal(await Evaluate(startup, "metrics.timestamp"), await Evaluate(second, "metrics.timestamp"));
            string oldTimestamp = await Evaluate(second, "metrics.timestamp");
            await WaitFor(second, $"metrics.timestamp !== {oldTimestamp}");
            Assert.Equal(await Evaluate(first, "metrics.timestamp"), await Evaluate(second, "metrics.timestamp"));
            first.Close();
            oldTimestamp = await Evaluate(second, "metrics.timestamp");
            await WaitFor(second, $"metrics.timestamp !== {oldTimestamp}");
            Assert.True(JsonSerializer.Deserialize<double>(await Evaluate(second, "metrics.memoryUsage")) > 0);
            await VerifyOverlayAsync(root, template, windows);
        }
        finally
        {
            foreach (WebWallpaperWindow window in windows) window.Close();
            // Only remove the uniquely generated fixture directory.
            string fixtureBase = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "seeWallpaper-performance-tests")) + Path.DirectorySeparatorChar;
            string fixturePath = Path.GetFullPath(root);
            if (!fixturePath.StartsWith(fixtureBase, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Fixture cleanup escaped its test directory.");
            Directory.Delete(fixturePath, recursive: true);
        }
    }

    private static async Task VerifyOverlayAsync(string root, InstalledTemplate template, List<WebWallpaperWindow> windows)
    {
        TemplateSettingsStore store = new(root);
        WebWallpaperWindow preview = new(template, new Dictionary<string, object?>(), false) { Width = 960, Height = 600 };
        windows.Add(preview);
        preview.Show();
        await preview.WaitUntilReadyAsync();
        const string widget = "document.getElementById('seeWallpaper-system-metrics')";
        const string panel = widget + ".shadowRoot.querySelector('section')";
        Assert.Equal("true", await Evaluate(preview, widget + ".hidden"));

        string previousLanguage = Localization.Current.Language;
        Localization.Current.ChangeLanguage("fr");
        IReadOnlyDictionary<string, object?>? desktopSettings = null;
        TemplateSettingsWindow editor = new(template, preview, store, new Dictionary<string, object?>(),
            values => { desktopSettings = values; return Task.CompletedTask; });
        try
        {
            editor.Show();
            FrameworkElement content = (FrameworkElement)editor.Content;
            CheckBox[] toggles = Descendants(content).OfType<CheckBox>().ToArray();
            Assert.Equal(6, toggles.Length);
            Assert.False(toggles[0].IsChecked);
            Assert.True(toggles[1].IsChecked);
            toggles[0].IsChecked = true;
            foreach (CheckBox toggle in toggles.Skip(3)) toggle.IsChecked = true;
            ComboBox[] choices = Descendants(content).OfType<ComboBox>().ToArray();
            choices[0].SelectedValue = "top-left";
            choices[1].SelectedValue = "graphs";
            choices[2].SelectedValue = "#70e1a1";
            Slider[] sliders = Descendants(content).OfType<Slider>().ToArray();
            sliders[0].Value = 120;
            sliders[1].Value = 60;
            sliders[2].Value = 32;
            for (int attempt = 0; attempt < 100 && (desktopSettings is null ||
                !desktopSettings.TryGetValue("__seeMetricsMargin", out object? margin) || !Equals(margin, 32d)); attempt++)
                await Task.Delay(50);
            Assert.NotNull(desktopSettings);
            Assert.Equal(32d, desktopSettings["__seeMetricsMargin"]);
            await WaitFor(preview, $"!{widget}.hidden && {panel}.querySelectorAll('.row').length === 5");
            await WaitFor(preview, "window.__seeWallpaperSystemInfo?.memoryUsage > 0");
            Assert.Equal("0", await Evaluate(preview, "calls.metrics")); // The overlay cannot replace the scene's listener.
            Assert.Equal("\"Métriques système\"", await Evaluate(preview, panel + ".querySelector('h2').textContent"));
            Assert.Equal("\"32px\"", await Evaluate(preview, $"getComputedStyle({panel}).left"));
            Assert.Equal("\"0.6\"", await Evaluate(preview, panel + ".style.getPropertyValue('--background')"));
            Assert.Equal("2", await Evaluate(preview, panel + ".querySelectorAll('svg').length"));

            string? review = Environment.GetEnvironmentVariable("SEEWALLPAPER_VISUAL_REVIEW");
            if (!string.IsNullOrWhiteSpace(review))
            {
                Directory.CreateDirectory(review);
                content.Measure(new Size(424, 680)); content.Arrange(new Rect(0, 0, 424, 680)); content.UpdateLayout();
                RenderTargetBitmap bitmap = new(424, 680, 96, 96, PixelFormats.Pbgra32);
                DrawingVisual drawing = new();
                using (DrawingContext context = drawing.RenderOpen())
                {
                    context.DrawRectangle((Brush)Application.Current.FindResource("Canvas"), null, new Rect(0, 0, 424, 680));
                    context.DrawRectangle(new VisualBrush(content), null, new Rect(0, 0, 424, 680));
                }
                bitmap.Render(drawing);
                PngBitmapEncoder encoder = new(); encoder.Frames.Add(BitmapFrame.Create(bitmap));
                using (Stream file = File.Create(Path.Combine(review, "metrics-settings-fr.png"))) encoder.Save(file);
                using Stream capture = File.Create(Path.Combine(review, "metrics-overlay.png"));
                await ((WebView2)preview.Content).CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, capture);
            }

            IReadOnlyDictionary<string, object?> saved = await store.LoadAsync(template.Manifest.Id, new Dictionary<string, object?>());
            WebWallpaperWindow restored = new(template, saved, false) { Width = 640, Height = 400 };
            windows.Add(restored); restored.Show(); await restored.WaitUntilReadyAsync().WaitAsync(TimeSpan.FromSeconds(35));
            await WaitFor(restored, $"!{widget}.hidden && window.__seeWallpaperSystemInfo?.memoryUsage > 0");
            Assert.Equal("\"#70e1a1\"", await Evaluate(restored, panel + ".style.getPropertyValue('--accent')"));
            await Evaluate(restored, "window.__seeWallpaperMetricsOverlay.metrics({cpuUsage:null,memoryUsage:null,hostname:'<script>unsafe</script>'})");
            Assert.Equal("\"—\"", await Evaluate(restored, panel + ".querySelector('.value').textContent"));
            Assert.Equal("0", await Evaluate(restored, panel + ".querySelectorAll('script').length"));

            choices[1].SelectedValue = "bars";
            await WaitFor(preview, panel + ".querySelectorAll('.bar').length === 2");
            toggles[0].IsChecked = false;
            await WaitFor(preview, widget + ".hidden");
            string last = await Evaluate(preview, "window.__seeWallpaperSystemInfo.timestamp");
            await Task.Delay(2300);
            Assert.Equal(last, await Evaluate(preview, "window.__seeWallpaperSystemInfo.timestamp"));
            await Evaluate(restored, "subscribe()");
            await WaitFor(restored, "calls.metrics > 0");
            await restored.UpdateSettingsAsync(new Dictionary<string, object?> { ["__seeMetricsEnabled"] = false });
            last = await Evaluate(restored, "metrics.timestamp");
            await WaitFor(restored, $"metrics.timestamp !== {last}"); // Disabling the overlay keeps native consumers alive.
        }
        finally { editor.Close(); Localization.Current.ChangeLanguage(previousLanguage); }
    }

    private static IEnumerable<DependencyObject> Descendants(DependencyObject parent)
    {
        foreach (object child in LogicalTreeHelper.GetChildren(parent))
            if (child is DependencyObject dependency)
            {
                yield return dependency;
                foreach (DependencyObject nested in Descendants(dependency)) yield return nested;
            }
    }

    private static Task<string> Evaluate(WebWallpaperWindow window, string script) => ((WebView2)window.Content).CoreWebView2.ExecuteScriptAsync(script);

    private static async Task WaitFor(WebWallpaperWindow window, string condition)
    {
        for (int attempt = 0; attempt < 100; attempt++)
        {
            if (await Evaluate(window, condition) == "true") return;
            await Task.Delay(100);
        }
        Assert.Fail("WebView condition was not met: " + condition);
    }

    private sealed class WebViewIntegrationFactAttribute : FactAttribute
    {
        public WebViewIntegrationFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("SEEWALLPAPER_WEBVIEW_TEST") != "1")
                Skip = "Run alone with SEEWALLPAPER_WEBVIEW_TEST=1 and --filter FullyQualifiedName~WebWallpaperPerformanceIntegrationTests (WPF Application thread isolation).";
        }
    }
}
