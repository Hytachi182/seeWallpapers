using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using SeeWallpaper.Engine;
using SeeWallpaper.TemplateEngine;
using SeeWallpaper.Platform;
using System.Reflection;
using System.Text.Json;
using Microsoft.Web.WebView2.Wpf;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        var app = new System.Windows.Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
        app.Startup += async (_, _) =>
        {
            if (args.Contains("--functional"))
            {
                try { await FunctionalScenarios.RunAsync(args); }
                catch (Exception exception) { Console.WriteLine(exception); Environment.ExitCode = 1; }
                finally { app.Shutdown(); }
                return;
            }
            await using var host = new DesktopWallpaperHost();
            try
            {
                var templates = await new FileTemplateCatalog(new TemplateManifestValidator()).DiscoverAsync(Path.GetFullPath("templates"));
                string id = args.FirstOrDefault(argument => !argument.StartsWith("--")) ?? "sakura-night";
                var template = templates.Single(scene => scene.Manifest.Id == id);
                var screens = new WindowsDisplayManager().GetDisplays().ToArray();
                foreach (var screen in screens) Console.WriteLine($"DISPLAY {screen.Id}: {screen.Width}x{screen.Height} at {screen.X},{screen.Y}");
                if (screens.Length < 2) throw new InvalidOperationException("This regression check requires at least two connected monitors.");
                var settings = new Dictionary<string, object?>();
                foreach (var screen in screens)
                {
                    if (args.Contains("--dpi-transition"))
                        SetThreadDpiAwarenessContext(new IntPtr(host.ActiveDisplayIds.Count == 0 ? -2 : -3));
                    Console.WriteLine("Applying " + screen.Id);
                    await host.ApplyAsync(template, screen.Id, settings).WaitAsync(TimeSpan.FromSeconds(40));
                    await VerifyWindows(host, screens);
                    Console.WriteLine("PASS " + screen.Id);
                }
                RequireCount(host, screens.Length);
                Console.WriteLine("Replacing same scene");
                await host.ApplyAsync(template, screens[0].Id, settings);
                RequireCount(host, screens.Length);
                await VerifyWindows(host, screens);
                Console.WriteLine("Clone");
                await host.ApplyCloneAsync(template, settings);
                RequireCount(host, screens.Length);
                await VerifyWindows(host, screens);
                Console.WriteLine("Span");
                await host.ApplySpanAsync(template, settings);
                RequireCount(host, 1);
                await VerifyWindows(host, screens);
                Console.WriteLine("Clone after span");
                await host.ApplyCloneAsync(template, settings);
                RequireCount(host, screens.Length);
                await VerifyWindows(host, screens);
                Console.WriteLine("PASS all transitions; active=" + host.ActiveDisplayIds.Count);
            }
            catch (Exception exception) { Console.WriteLine(exception); Environment.ExitCode = 1; }
            finally { await host.StopAsync(); app.Shutdown(); }
        };
        app.Run();
    }

    private static void RequireCount(DesktopWallpaperHost host, int expected)
    {
        if (host.ActiveDisplayIds.Count != expected) throw new InvalidOperationException($"Expected {expected} active displays, got {host.ActiveDisplayIds.Count}.");
    }

    private static async Task VerifyWindows(DesktopWallpaperHost host, IReadOnlyList<DisplayInfo> displays)
    {
        await Task.Delay(250); // Let WPF and the WebView controller finish processing native resize messages.
        var windows = (Dictionary<string, WebWallpaperWindow>)typeof(DesktopWallpaperHost).GetField("_wallpaperWindows", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(host)!;
        foreach (var (id, window) in windows)
        {
            WallpaperBounds expected = id == "span" ? WallpaperBounds.Span(displays) : WallpaperBounds.FromDisplay(displays.Single(display => display.Id == id));
            using (DisplayDpiContext dpi = DisplayDpiContext.PhysicalPixels())
            {
                if (!GetWindowRect(new System.Windows.Interop.WindowInteropHelper(window).Handle, out NativeRect rect)) throw new InvalidOperationException("Cannot read wallpaper bounds");
                if (rect.Left != expected.X || rect.Top != expected.Y || rect.Right - rect.Left != expected.Width || rect.Bottom - rect.Top != expected.Height)
                    throw new InvalidOperationException($"{id}: HWND {rect.Left},{rect.Top} {rect.Right-rect.Left}x{rect.Bottom-rect.Top}; expected {expected}");
            }
            var view = (WebView2)typeof(WebWallpaperWindow).GetField("_webView", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(window)!;
            string result = await view.CoreWebView2.ExecuteScriptAsync("JSON.stringify({width:innerWidth,height:innerHeight,dpi:devicePixelRatio})");
            using JsonDocument viewport = JsonDocument.Parse(JsonSerializer.Deserialize<string>(result)!);
            double pixelsX = viewport.RootElement.GetProperty("width").GetDouble() * viewport.RootElement.GetProperty("dpi").GetDouble();
            double pixelsY = viewport.RootElement.GetProperty("height").GetDouble() * viewport.RootElement.GetProperty("dpi").GetDouble();
            if (Math.Abs(pixelsX-expected.Width)>2 || Math.Abs(pixelsY-expected.Height)>2)
                throw new InvalidOperationException($"{id}: WebView physical viewport {pixelsX}x{pixelsY}; expected {expected.Width}x{expected.Height}");
            Console.WriteLine($"GEOMETRY PASS {id}: HWND and WebView fill {expected.Width}x{expected.Height}");
        }
    }

    [StructLayout(LayoutKind.Sequential)] private struct NativeRect { public int Left; public int Top; public int Right; public int Bottom; }
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out NativeRect rectangle);

    [DllImport("user32.dll")]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
