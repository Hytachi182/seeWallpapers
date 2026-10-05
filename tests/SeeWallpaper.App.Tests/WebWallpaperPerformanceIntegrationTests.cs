using System.IO;
using System.Text.Json;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Wpf;
using SeeWallpaper.Core;
using SeeWallpaper.Engine;
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
            Dispatcher dispatcher = Dispatcher.CurrentDispatcher;
            dispatcher.BeginInvoke(new Action(async () =>
            {
                try { await VerifyAsync(); }
                catch (Exception exception) { failure = exception; }
                finally { dispatcher.BeginInvokeShutdown(DispatcherPriority.Normal); }
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
