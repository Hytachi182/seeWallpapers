using System.Runtime.InteropServices;

namespace SeeWallpaper.Platform;

public sealed class WindowsSystemMetricsService : ISystemMetricsService
{
    private ulong? _previousIdle;
    private ulong? _previousTotal;

    public SystemMetrics GetSnapshot()
    {
        GlobalMemoryStatus memory = new() { Length = (uint)Marshal.SizeOf<GlobalMemoryStatus>() };
        if (!GlobalMemoryStatusEx(ref memory)) throw new InvalidOperationException("Windows memory metrics are unavailable.");
        SystemPowerStatus power = new();
        bool powerAvailable = GetSystemPowerStatus(out power);
        (ulong idle, ulong total) = ReadCpuTimes();
        double? cpu = null;
        if (_previousIdle is not null && _previousTotal is not null && total > _previousTotal)
            cpu = Math.Round(100d * (1d - (double)(idle - _previousIdle.Value) / (total - _previousTotal.Value)), 1);
        _previousIdle = idle;
        _previousTotal = total;
        return new SystemMetrics(cpu, Math.Round(100d * (1d - (double)memory.AvailablePhysical / memory.TotalPhysical), 1), TimeSpan.FromMilliseconds(Environment.TickCount64), Environment.MachineName, powerAvailable ? power.AcLineStatus == 0 : null, DateTimeOffset.UtcNow);
    }

    private static (ulong Idle, ulong Total) ReadCpuTimes()
    {
        if (!GetSystemTimes(out FileTime idle, out FileTime kernel, out FileTime user)) throw new InvalidOperationException("Windows CPU metrics are unavailable.");
        ulong idleValue = ToUInt64(idle);
        return (idleValue, ToUInt64(kernel) + ToUInt64(user));
    }

    private static ulong ToUInt64(FileTime time) => ((ulong)time.HighDateTime << 32) | time.LowDateTime;

    [StructLayout(LayoutKind.Sequential)] private struct FileTime { public uint LowDateTime; public uint HighDateTime; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)] private struct GlobalMemoryStatus { public uint Length; public uint MemoryLoad; public ulong TotalPhysical; public ulong AvailablePhysical; public ulong TotalPageFile; public ulong AvailablePageFile; public ulong TotalVirtual; public ulong AvailableVirtual; public ulong AvailableExtendedVirtual; }
    [StructLayout(LayoutKind.Sequential)] private struct SystemPowerStatus { public byte AcLineStatus; public byte BatteryFlag; public byte BatteryLifePercent; public byte SystemStatusFlag; public uint BatteryLifeTime; public uint BatteryFullLifeTime; }
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GlobalMemoryStatusEx(ref GlobalMemoryStatus buffer);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetSystemPowerStatus(out SystemPowerStatus status);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetSystemTimes(out FileTime idleTime, out FileTime kernelTime, out FileTime userTime);
}
