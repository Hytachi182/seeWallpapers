using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Windows.Threading;
using SeeWallpaper.Platform;

namespace SeeWallpaper.Engine;

// One collector per UI dispatcher, shared by desktop windows and previews.
internal sealed class SharedSystemMetricsSource
{
    private static readonly ConditionalWeakTable<Dispatcher, SharedSystemMetricsSource> Sources = new();
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly ISystemMetricsService _service;
    private readonly DispatcherTimer _timer;
    private readonly HashSet<Action<string>> _subscribers = [];
    private string? _snapshot;

    internal static SharedSystemMetricsSource Current => Sources.GetValue(Dispatcher.CurrentDispatcher,
        _ => new SharedSystemMetricsSource(new WindowsSystemMetricsService()));

    internal SharedSystemMetricsSource(ISystemMetricsService service)
    {
        _service = service;
        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
        _timer.Tick += (_, _) => Refresh();
    }

    internal string GetSnapshotJson() => _snapshot ??= JsonSerializer.Serialize(_service.GetSnapshot(), JsonOptions);

    internal void Subscribe(Action<string> subscriber)
    {
        _subscribers.Add(subscriber);
        _timer.Start();
    }

    internal void Unsubscribe(Action<string> subscriber)
    {
        _subscribers.Remove(subscriber);
        if (_subscribers.Count != 0) return;
        _timer.Stop();
        _snapshot = null;
    }

    internal void Refresh()
    {
        if (_subscribers.Count == 0) return;
        _snapshot = JsonSerializer.Serialize(_service.GetSnapshot(), JsonOptions);
        foreach (Action<string> subscriber in _subscribers.ToArray())
            if (_subscribers.Contains(subscriber)) subscriber(_snapshot);
    }
}
