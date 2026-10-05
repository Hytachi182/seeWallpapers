using System.IO;
using Microsoft.Win32;

namespace SeeWallpaper.App;

/// <summary>
/// The per-user sign-in entry that restores wallpapers after a restart.
/// Uses the same Run value as the installer's startup task, so both stay in sync.
/// </summary>
internal sealed class StartupRegistration(string keyPath = StartupRegistration.RunKey, string valueName = "seeWallpaper")
{
    public const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

    /// <summary>True when the entry exists and still points to an executable on disk.</summary>
    public bool IsEnabled
    {
        get
        {
            using RegistryKey? key = Registry.CurrentUser.OpenSubKey(keyPath);
            return key?.GetValue(valueName) is string command && ExtractExecutable(command) is { } path && File.Exists(path);
        }
    }

    public void Enable(string executablePath)
    {
        using RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath);
        key.SetValue(valueName, $"\"{executablePath}\" --minimized", RegistryValueKind.String);
    }

    public void Disable()
    {
        using RegistryKey? key = Registry.CurrentUser.OpenSubKey(keyPath, writable: true);
        key?.DeleteValue(valueName, throwOnMissingValue: false);
    }

    internal static string? ExtractExecutable(string command)
    {
        command = command.Trim();
        if (command.StartsWith('"'))
        {
            int end = command.IndexOf('"', 1);
            return end > 1 ? command[1..end] : null;
        }
        int space = command.IndexOf(' ');
        return space < 0 ? command : command[..space];
    }
}
