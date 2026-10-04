using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using SeeWallpaper.Engine;
using SeeWallpaper.TemplateEngine;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        var app = new System.Windows.Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
        app.Startup += async (_, _) =>
        {
            await using var host = new DesktopWallpaperHost();
            try
            {
                var templates = await new FileTemplateCatalog(new TemplateManifestValidator()).DiscoverAsync(Path.GetFullPath("templates"));
                string id = args.FirstOrDefault(argument => !argument.StartsWith("--")) ?? "sakura-night";
                var template = templates.Single(scene => scene.Manifest.Id == id);
                var screens = System.Windows.Forms.Screen.AllScreens;
                if (screens.Length < 2) throw new InvalidOperationException("This regression check requires at least two connected monitors.");
                var settings = new Dictionary<string, object?>();
                foreach (var screen in screens)
                {
                    if (args.Contains("--dpi-transition"))
                        SetThreadDpiAwarenessContext(new IntPtr(host.ActiveDisplayIds.Count == 0 ? -2 : -3));
                    Console.WriteLine("Applying " + screen.DeviceName);
                    await host.ApplyAsync(template, screen.DeviceName, settings).WaitAsync(TimeSpan.FromSeconds(40));
                    Console.WriteLine("PASS " + screen.DeviceName);
                }
                RequireCount(host, screens.Length);
                Console.WriteLine("Replacing same scene");
                await host.ApplyAsync(template, screens[0].DeviceName, settings);
                RequireCount(host, screens.Length);
                Console.WriteLine("Clone");
                await host.ApplyCloneAsync(template, settings);
                RequireCount(host, screens.Length);
                Console.WriteLine("Span");
                await host.ApplySpanAsync(template, settings);
                RequireCount(host, 1);
                Console.WriteLine("Clone after span");
                await host.ApplyCloneAsync(template, settings);
                RequireCount(host, screens.Length);
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

    [DllImport("user32.dll")]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
