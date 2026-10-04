namespace SeeWallpaper.Platform;

public sealed record SystemMetrics(double? CpuUsage, double? MemoryUsage, TimeSpan Uptime, string Hostname, bool? IsOnBattery, DateTimeOffset Timestamp);

public interface ISystemMetricsService
{
    SystemMetrics GetSnapshot();
}
