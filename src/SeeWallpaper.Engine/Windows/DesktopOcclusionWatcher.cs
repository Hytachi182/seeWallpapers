using System.Runtime.InteropServices;
using System.Windows.Threading;

namespace SeeWallpaper.Engine.Windows;

// Signals when top-level windows may have changed what covers the desktop.
// Out-of-context WinEvent hooks are delivered on this dispatcher's message loop.
internal sealed class DesktopOcclusionWatcher : IDisposable
{
    private const uint WinEventOutOfContext = 0x0000;
    private const int ObjectIdWindow = 0;
    private static readonly (uint Min, uint Max)[] EventRanges =
    [
        (0x0003, 0x0003), // EVENT_SYSTEM_FOREGROUND
        (0x000A, 0x000B), // EVENT_SYSTEM_MOVESIZESTART/END
        (0x0016, 0x0017), // EVENT_SYSTEM_MINIMIZESTART/END
        (0x8001, 0x8003), // EVENT_OBJECT_DESTROY/SHOW/HIDE
        (0x800B, 0x800B), // EVENT_OBJECT_LOCATIONCHANGE
        (0x8017, 0x8018)  // EVENT_OBJECT_CLOAKED/UNCLOAKED
    ];

    private readonly WinEventProc _callback;
    private readonly List<IntPtr> _hooks = [];
    private readonly DispatcherTimer _coalesce;
    private readonly DispatcherTimer _fallback;

    internal DesktopOcclusionWatcher(Action changed)
    {
        _callback = OnWinEvent;
        // Visible changes are rare compared to their events; one check per burst is enough.
        _coalesce = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromMilliseconds(100) };
        _coalesce.Tick += (_, _) => { _coalesce.Stop(); changed(); };
        // Covers anything the hooks cannot report, such as an Explorer restart.
        _fallback = new DispatcherTimer(DispatcherPriority.Background) { Interval = TimeSpan.FromSeconds(3) };
        _fallback.Tick += (_, _) => changed();
        foreach ((uint min, uint max) in EventRanges)
        {
            IntPtr hook = SetWinEventHook(min, max, IntPtr.Zero, _callback, 0, 0, WinEventOutOfContext);
            if (hook != IntPtr.Zero) _hooks.Add(hook);
        }
        _fallback.Start();
    }

    internal void RequestCheck()
    {
        if (!_coalesce.IsEnabled) _coalesce.Start();
    }

    public void Dispose()
    {
        _coalesce.Stop();
        _fallback.Stop();
        foreach (IntPtr hook in _hooks) UnhookWinEvent(hook);
        _hooks.Clear();
    }

    private void OnWinEvent(IntPtr hook, uint eventType, IntPtr window, int objectId, int childId, uint threadId, uint time)
    {
        if (objectId == ObjectIdWindow && childId == 0 && window != IntPtr.Zero) RequestCheck();
    }

    private delegate void WinEventProc(IntPtr hook, uint eventType, IntPtr window, int objectId, int childId, uint threadId, uint time);
    [DllImport("user32.dll")] private static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr module, WinEventProc callback, uint processId, uint threadId, uint flags);
    [DllImport("user32.dll")] private static extern bool UnhookWinEvent(IntPtr hook);
}
