using SeeWallpaper.Engine;
using SeeWallpaper.Platform;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class SharedSystemMetricsSourceTests
{
    [Fact]
    public void Consumers_share_one_snapshot_and_last_unsubscribe_stops_collection()
    {
        FakeMetrics service = new();
        SharedSystemMetricsSource source = new(service);
        List<string> first = [], second = [];
        Action<string> receiveFirst = first.Add, receiveSecond = second.Add;
        source.Refresh();
        Assert.Equal(0, service.Reads);
        source.Subscribe(receiveFirst);
        source.Subscribe(receiveSecond);
        try
        {
            Assert.Equal(source.GetSnapshotJson(), source.GetSnapshotJson());
            Assert.Equal(1, service.Reads);
            source.Refresh();
            Assert.Equal(2, service.Reads);
            Assert.Equal(Assert.Single(first), Assert.Single(second));
            source.Unsubscribe(receiveFirst);
            source.Refresh();
            Assert.Single(first);
            Assert.Equal(2, second.Count);
            source.Unsubscribe(receiveSecond);
            source.Refresh();
            Assert.Equal(3, service.Reads);
            source.Subscribe(receiveFirst);
            source.GetSnapshotJson();
            Assert.Equal(4, service.Reads); // A later consumer gets fresh data.
        }
        finally
        {
            source.Unsubscribe(receiveFirst);
            source.Unsubscribe(receiveSecond);
        }
    }

    private sealed class FakeMetrics : ISystemMetricsService
    {
        internal int Reads { get; private set; }
        public SystemMetrics GetSnapshot() => new(++Reads, 40, TimeSpan.Zero, "test", false, DateTimeOffset.UtcNow);
    }
}
