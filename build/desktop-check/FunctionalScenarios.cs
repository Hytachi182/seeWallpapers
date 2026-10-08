using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using SeeWallpaper.App;
using SeeWallpaper.Core;
using SeeWallpaper.Engine;
using SeeWallpaper.Infrastructure;
using SeeWallpaper.Platform;

internal static class FunctionalScenarios
{
    private static readonly Dictionary<string, object?> Settings = new();
    private static readonly List<object> Checks = [];
    private static int _capture;
    private static string _output = "";

    internal static async Task RunAsync(string[] args)
    {
        string scenario = Option(args, "--scenario") ?? throw new ArgumentException("--scenario is required");
        _output = Path.GetFullPath(Option(args, "--output") ?? Path.Combine("build", "functional-results", scenario));
        Directory.CreateDirectory(_output);
        string data = Path.Combine(_output, "isolated-data");
        DisplayInfo[] displays = new WindowsDisplayManager().GetDisplays().ToArray();
        Require(displays.Length >= 3, "Functional multi-monitor tests require at least three connected monitors; use the target workstation.");
        Console.WriteLine($"SCENARIO {scenario}: {displays.Length} real monitors");
        foreach (DisplayInfo display in displays) Console.WriteLine($"DISPLAY {display.Id}: {display.Width}x{display.Height} at {display.X},{display.Y}");

        Fixture[] fixtures = await CreateFixturesAsync(Path.Combine(_output, "fixtures"));
        Dictionary<string, InstalledTemplate> templates = fixtures.ToDictionary(f => f.Template.Manifest.Id, f => f.Template);
        WallpaperAssignmentsStore store = new(data);
        ConnectedDisplays manager = new(displays);
        await using DesktopWallpaperHost host = new();
        WallpaperAssignmentService Service() => new(host, manager, store, id => templates.GetValueOrDefault(id), _ => Task.FromResult<IReadOnlyDictionary<string, object?>>(Settings));
        WallpaperAssignmentService service = Service();
        Dictionary<string, Fixture> expected = new(StringComparer.OrdinalIgnoreCase);
        try
        {
            switch (scenario)
            {
                case "independent":
                    await ApplyDifferentAsync(service, displays, fixtures, expected);
                    await VerifyAsync(host, displays, expected, "different-scenes");
                    var untouched = Handles(host);
                    await service.ApplyAsync(fixtures[3].Template, displays[0], Settings);
                    expected[displays[0].Id] = fixtures[3];
                    foreach (DisplayInfo display in displays.Skip(1)) Require(Handles(host)[display.Id] == untouched[display.Id], "Replacing one display recreated an unrelated wallpaper");
                    await VerifyAsync(host, displays, expected, "targeted-replacement");
                    WallpaperAssignmentsDocument saved = await store.LoadAsync();
                    Require(saved.Assignments.Count == displays.Length, "Independent state must persist every display");
                    InstalledTemplate broken = fixtures[0].Template with { RootPath = Path.Combine(_output, "missing-scene") };
                    bool failed = false;
                    try { await service.ApplyAsync(broken, displays[0], Settings); }
                    catch (InvalidOperationException) { failed = true; }
                    Require(failed, "An unreadable scene must fail application");
                    await VerifyAsync(host, displays, expected, "failed-replacement-preserves-content");
                    WallpaperAssignmentsDocument afterFailure = await store.LoadAsync();
                    Require(JsonSerializer.Serialize(saved) == JsonSerializer.Serialize(afterFailure), "Failed replacement changed persisted assignments");
                    await service.RemoveAsync(displays[1]); expected.Remove(displays[1].Id);
                    await VerifyAsync(host, displays, expected, "remove-one-preserves-others");
                    Require((await store.LoadAsync()).Assignments.Count == displays.Length - 1, "Targeted removal persistence is incorrect");
                    break;

                case "clone-span-local":
                    await service.ApplyGlobalAsync(fixtures[0].Template, Settings, WallpaperAssignmentMode.Clone);
                    foreach (DisplayInfo display in displays) expected[display.Id] = fixtures[0];
                    await VerifyAsync(host, displays, expected, "duplicate-full-scenes");
                    Require((await store.LoadAsync()).Mode == WallpaperAssignmentMode.Clone, "Clone state was not persisted");
                    Windows(host)[displays[0].Id].Close();
                    Require(!host.ActiveDisplayIds.Contains(displays[0].Id), "A closed clone window must not be reported as active");
                    Require((await service.ReconcileDisplaysAsync()).Count == 0, "Clone recovery returned errors");
                    await VerifyAsync(host, displays, expected, "recover-closed-clone-window");
                    await service.ApplyGlobalAsync(fixtures[0].Template, Settings, WallpaperAssignmentMode.Span);
                    expected.Clear(); expected["span"] = fixtures[0];
                    await VerifyAsync(host, displays, expected, "single-panorama");
                    Require((await store.LoadAsync()).Mode == WallpaperAssignmentMode.Span, "Span state was not persisted");
                    Windows(host)["span"].Close();
                    Require(!host.ActiveDisplayIds.Contains("span"), "A closed span window must not be reported as active");
                    Require((await service.ReconcileDisplaysAsync()).Count == 0, "Span recovery returned errors");
                    await VerifyAsync(host, displays, expected, "recover-closed-span-window");
                    await service.ApplyAsync(fixtures[1].Template, displays[0], Settings);
                    expected.Clear(); foreach (DisplayInfo display in displays) expected[display.Id] = fixtures[0]; expected[displays[0].Id] = fixtures[1];
                    await VerifyAsync(host, displays, expected, "local-selection-exits-panorama");
                    Require((await store.LoadAsync()).Mode == WallpaperAssignmentMode.Independent, "Local selection must persist independent mode");
                    break;

                case "restore":
                    await ApplyDifferentAsync(service, displays, fixtures, expected);
                    await host.StopAsync(); Require(host.ActiveDisplayIds.Count == 0, "Stop must remove all test windows");
                    WallpaperAssignmentService restored = Service();
                    await restored.RestoreAsync(templates, _ => Task.FromResult<IReadOnlyDictionary<string, object?>>(Settings));
                    Require(restored.RestoreWarnings.Count == 0, "Independent restore returned warnings");
                    await VerifyAsync(host, displays, expected, "restore-independent-from-disk");
                    await restored.ApplyGlobalAsync(fixtures[2].Template, Settings, WallpaperAssignmentMode.Clone);
                    await host.StopAsync(); restored = Service();
                    await restored.RestoreAsync(templates, _ => Task.FromResult<IReadOnlyDictionary<string, object?>>(Settings));
                    foreach (DisplayInfo display in displays) expected[display.Id] = fixtures[2];
                    await VerifyAsync(host, displays, expected, "restore-duplicate-from-disk");
                    await restored.ApplyGlobalAsync(fixtures[1].Template, Settings, WallpaperAssignmentMode.Span);
                    await host.StopAsync(); restored = Service();
                    await restored.RestoreAsync(templates, _ => Task.FromResult<IReadOnlyDictionary<string, object?>>(Settings));
                    expected.Clear(); expected["span"] = fixtures[1];
                    await VerifyAsync(host, displays, expected, "restore-panorama-from-disk");
                    break;

                case "dpi-contexts":
                    foreach (int context in new[] { -1, -2, -3, -4 })
                    {
                        IntPtr previous = SetThreadDpiAwarenessContext(new IntPtr(context));
                        Require(previous != IntPtr.Zero, "Cannot set test DPI context");
                        try
                        {
                            Require(displays.SequenceEqual(new WindowsDisplayManager().GetDisplays()), "Display geometry depends on caller DPI");
                            await ApplyDifferentAsync(service, displays, fixtures, expected);
                            await VerifyAsync(host, displays, expected, $"dpi-{context}");
                        }
                        finally { SetThreadDpiAwarenessContext(previous); }
                    }
                    break;

                case "reconcile":
                    await ApplyDifferentAsync(service, displays, fixtures, expected);
                    var kept = Handles(host);
                    manager.Connected = displays.Skip(1).ToArray();
                    Require((await service.ReconcileDisplaysAsync()).Count == 0, "Disconnect reconciliation returned errors");
                    expected.Remove(displays[0].Id);
                    await VerifyAsync(host, displays, expected, "simulated-disconnect");
                    Require((await store.LoadAsync()).Assignments.Count == displays.Length, "Disconnected monitor lost its saved assignment");
                    manager.Connected = displays;
                    Require((await service.ReconcileDisplaysAsync()).Count == 0, "Reconnect reconciliation returned errors");
                    expected[displays[0].Id] = fixtures[0];
                    foreach (DisplayInfo display in displays.Skip(1)) Require(Handles(host)[display.Id] == kept[display.Id], "Reconnect changed a still-connected wallpaper");
                    await VerifyAsync(host, displays, expected, "simulated-reconnect");
                    break;

                default: throw new ArgumentException($"Unknown scenario: {scenario}");
            }
            await host.StopAsync();
            Require(host.ActiveDisplayIds.Count == 0, "Cleanup left desktop windows running");
            await ReportAsync(scenario, displays, true, null);
            Console.WriteLine($"PASS FUNCTIONAL {scenario}: geometry, viewport and rendered edge pixels verified");
        }
        catch (Exception exception)
        {
            await ReportAsync(scenario, displays, false, exception.ToString());
            throw;
        }
    }

    private static async Task ApplyDifferentAsync(WallpaperAssignmentService service, DisplayInfo[] displays, Fixture[] fixtures, Dictionary<string, Fixture> expected)
    {
        expected.Clear();
        for (int i = 0; i < displays.Length; i++)
        {
            Fixture fixture = fixtures[i % 3];
            await service.ApplyAsync(fixture.Template, displays[i], Settings).WaitAsync(TimeSpan.FromSeconds(40));
            expected[displays[i].Id] = fixture;
        }
    }

    private static async Task VerifyAsync(DesktopWallpaperHost host, IReadOnlyList<DisplayInfo> displays, Dictionary<string, Fixture> expected, string step)
    {
        Dictionary<string, WebWallpaperWindow> windows = Windows(host);
        Require(windows.Keys.Order().SequenceEqual(expected.Keys.Order()), $"{step}: wrong active monitor set");
        foreach (var (id, window) in windows)
        {
            WallpaperBounds bounds = id == "span" ? WallpaperBounds.Span(displays) : WallpaperBounds.FromDisplay(displays.Single(display => display.Id == id));
            Fixture fixture = expected[id];
            WebView2 view = View(window);
            JsonElement viewport = default;
            for (int attempt = 0; attempt < 80; attempt++)
            {
                viewport = await EvaluateAsync(view, "({width:innerWidth,height:innerHeight,dpi:devicePixelRatio,scene:document.body.dataset.scene,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})");
                double ratio = viewport.GetProperty("dpi").GetDouble();
                if (Math.Abs(viewport.GetProperty("width").GetDouble() * ratio - bounds.Width) <= 2 && Math.Abs(viewport.GetProperty("height").GetDouble() * ratio - bounds.Height) <= 2) break;
                await Task.Delay(50);
            }
            using (DisplayDpiContext dpi = DisplayDpiContext.PhysicalPixels())
            {
                IntPtr handle = new WindowInteropHelper(window).Handle;
                Require(GetWindowRect(handle, out NativeRect rect), "Cannot read native window bounds");
                Require(rect.Left == bounds.X && rect.Top == bounds.Y && rect.Right - rect.Left == bounds.Width && rect.Bottom - rect.Top == bounds.Height, $"{step}/{id}: native window does not fill the intended monitor");
                StringBuilder parentClass = new(128);
                GetClassName(GetParent(handle), parentClass, parentClass.Capacity);
                Require(parentClass.ToString() == "WorkerW", $"{id}: wallpaper is not attached to the Explorer wallpaper surface");
            }
            double dpr = viewport.GetProperty("dpi").GetDouble();
            double width = viewport.GetProperty("width").GetDouble(), height = viewport.GetProperty("height").GetDouble();
            Require(Math.Abs(width * dpr - bounds.Width) <= 2 && Math.Abs(height * dpr - bounds.Height) <= 2, $"{step}/{id}: clipped or incorrectly scaled WebView viewport");
            Require(viewport.GetProperty("scene").GetString() == fixture.Template.Manifest.Id, $"{step}/{id}: wrong scene displayed");
            Require(viewport.GetProperty("scrollWidth").GetDouble() <= width && viewport.GetProperty("scrollHeight").GetDouble() <= height, $"{step}/{id}: scene overflows the viewport");
            string capture = Path.Combine(_output, $"{++_capture:000}-{step}-{fixture.Template.Manifest.Id}.png");
            await using (FileStream stream = File.Create(capture)) await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
            VerifyEdgePixels(capture, bounds, fixture.Color);
            Checks.Add(new { step, id, bounds, viewport, capture });
            Console.WriteLine($"PASS {step}/{id}: {bounds.Width}x{bounds.Height}, scene={fixture.Template.Manifest.Id}, full-color edges");
        }
    }

    private static void VerifyEdgePixels(string file, WallpaperBounds bounds, Color expected)
    {
        BitmapImage image = new();
        image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad; image.UriSource = new Uri(file); image.EndInit();
        Require(Math.Abs(image.PixelWidth - bounds.Width) <= 2 && Math.Abs(image.PixelHeight - bounds.Height) <= 2, "Rendered image is not the expected physical resolution");
        FormatConvertedBitmap pixels = new(image, PixelFormats.Bgra32, null, 0);
        foreach (var (x, y) in new[] { (2, 2), (pixels.PixelWidth - 3, 2), (2, pixels.PixelHeight - 3), (pixels.PixelWidth - 3, pixels.PixelHeight - 3), (pixels.PixelWidth / 2, 2), (pixels.PixelWidth / 2, pixels.PixelHeight - 3), (2, pixels.PixelHeight / 2), (pixels.PixelWidth - 3, pixels.PixelHeight / 2) })
        {
            byte[] sample = new byte[4];pixels.CopyPixels(new System.Windows.Int32Rect(x, y, 1, 1), sample, 4, 0);
            Require(Math.Abs(sample[0] - expected.B) <= 3 && Math.Abs(sample[1] - expected.G) <= 3 && Math.Abs(sample[2] - expected.R) <= 3, $"Uncovered or incorrect scene at edge pixel {x},{y}: {sample[2]},{sample[1]},{sample[0]}");
        }
    }

    private static async Task<Fixture[]> CreateFixturesAsync(string root)
    {
        List<Fixture> result = [];
        foreach (var (id, color) in new[] { ("functional-a", "#d34d49"), ("functional-b", "#288c73"), ("functional-c", "#4765c0"), ("functional-d", "#b99127") })
        {
            string folder = Path.Combine(root, id);Directory.CreateDirectory(folder);
            await File.WriteAllTextAsync(Path.Combine(folder, "index.html"), $"<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><style>html,body{{margin:0;width:100%;height:100%;overflow:hidden;background:{color}}}main{{position:fixed;inset:0;display:grid;place-content:center;color:white;font:24px sans-serif}}</style></head><body data-scene='{id}'><main>{id}</main></body></html>");
            InstalledTemplate template = new(new TemplateManifest(1, id, id, "Functional coverage fixture", "tests", "1.0.0", "Tests", "web", "index.html", "preview.png", "low", []), folder, 0);
            result.Add(new Fixture(template, (Color)ColorConverter.ConvertFromString(color)));
        }
        return result.ToArray();
    }

    private static async Task<JsonElement> EvaluateAsync(WebView2 view, string expression)
    {
        using JsonDocument document = JsonDocument.Parse(await view.CoreWebView2.ExecuteScriptAsync(expression));
        return document.RootElement.Clone();
    }
    private static Task ReportAsync(string scenario, DisplayInfo[] displays, bool passed, string? error) => File.WriteAllTextAsync(Path.Combine(_output, "report.json"), JsonSerializer.Serialize(new
    {
        scenario, passed, error, displays, checks = Checks,
        engineAssembly = typeof(DesktopWallpaperHost).Assembly.Location,
        applicationAssembly = typeof(WallpaperAssignmentService).Assembly.Location
    }, new JsonSerializerOptions { WriteIndented = true }));
    private static string? Option(string[] args, string name) { int i = Array.IndexOf(args, name);return i >= 0 && i + 1 < args.Length ? args[i + 1] : null; }
    private static void Require(bool condition, string message) { if (!condition) throw new InvalidOperationException(message); }
    private static Dictionary<string, WebWallpaperWindow> Windows(DesktopWallpaperHost host) => (Dictionary<string, WebWallpaperWindow>)typeof(DesktopWallpaperHost).GetField("_wallpaperWindows", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(host)!;
    private static Dictionary<string, IntPtr> Handles(DesktopWallpaperHost host) => Windows(host).ToDictionary(p => p.Key, p => new WindowInteropHelper(p.Value).Handle);
    private static WebView2 View(WebWallpaperWindow window) => (WebView2)typeof(WebWallpaperWindow).GetField("_webView", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(window)!;
    private sealed record Fixture(InstalledTemplate Template, Color Color);
    private sealed class ConnectedDisplays(DisplayInfo[] connected) : IDisplayManager
    {
        public DisplayInfo[] Connected { get; set; } = connected;
        public IReadOnlyList<DisplayInfo> GetDisplays() => Connected;
    }
    [StructLayout(LayoutKind.Sequential)] private struct NativeRect { public int Left; public int Top; public int Right; public int Bottom; }
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out NativeRect rectangle);
    [DllImport("user32.dll")] private static extern IntPtr GetParent(IntPtr window);
    [DllImport("user32.dll", EntryPoint = "GetClassNameW", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr window, StringBuilder name, int size);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
