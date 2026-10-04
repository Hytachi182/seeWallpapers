using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;

namespace SeeWallpaper.Engine.Windows;

internal static class WebViewEnvironmentProvider
{
    private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<Dispatcher, Dictionary<string, Task<CoreWebView2Environment>>> Environments = new();

    internal static async Task<CoreWebView2Environment> GetAsync(string templateId)
    {
        Dispatcher dispatcher = Dispatcher.CurrentDispatcher;
        dispatcher.VerifyAccess();
        // SetParent to Explorer can change the caller's DPI awareness. WebView2
        // rejects a controller sharing a browser started with different DPI options.
        int awareness = GetAwarenessFromDpiAwarenessContext(GetThreadDpiAwarenessContext());
        string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "seeWallpaper", "webview-v2", templateId, $"dpi-{awareness}");
        Dictionary<string, Task<CoreWebView2Environment>> environments = Environments.GetOrCreateValue(dispatcher);
        if (!environments.TryGetValue(folder, out Task<CoreWebView2Environment>? pending))
        {
            pending = CoreWebView2Environment.CreateAsync(null, folder);
            environments.Add(folder, pending);
        }
        try { return await pending; }
        catch { environments.Remove(folder); throw; }
    }

    [DllImport("user32.dll")] private static extern IntPtr GetThreadDpiAwarenessContext();
    [DllImport("user32.dll")] private static extern int GetAwarenessFromDpiAwarenessContext(IntPtr context);
}
