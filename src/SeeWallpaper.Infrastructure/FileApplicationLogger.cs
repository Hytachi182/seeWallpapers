namespace SeeWallpaper.Infrastructure;

public sealed class FileApplicationLogger
{
    private readonly string _logPath;

    public FileApplicationLogger(string dataRoot)
    {
        string logsDirectory = Path.Combine(dataRoot, "logs");
        Directory.CreateDirectory(logsDirectory);
        _logPath = Path.Combine(logsDirectory, $"seeWallpaper-{DateTime.UtcNow:yyyy-MM-dd}.log");
    }

    public Task InfoAsync(string message) => WriteAsync("INFO", message);
    public Task ErrorAsync(string message, Exception exception) => WriteAsync("ERROR", $"{message} {exception}");

    private Task WriteAsync(string level, string message) => File.AppendAllTextAsync(_logPath, $"{DateTimeOffset.UtcNow:O} [{level}] {message}{Environment.NewLine}");
}
