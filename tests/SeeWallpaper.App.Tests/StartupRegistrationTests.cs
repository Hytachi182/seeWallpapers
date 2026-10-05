using Microsoft.Win32;
using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class StartupRegistrationTests : IDisposable
{
    // A throwaway key, never the real Run key.
    private readonly string _keyPath = $@"Software\seeWallpaper-tests\{Guid.NewGuid():N}";

    [Fact]
    public void Enable_writes_the_installer_compatible_command_and_disable_removes_it()
    {
        StartupRegistration registration = new(_keyPath);
        string executable = Environment.ProcessPath!;
        Assert.False(registration.IsEnabled);

        registration.Enable(executable);
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(_keyPath)!)
            Assert.Equal($"\"{executable}\" --minimized", key.GetValue("seeWallpaper"));
        Assert.True(registration.IsEnabled);

        registration.Disable();
        Assert.False(registration.IsEnabled);
    }

    [Fact]
    public void An_entry_pointing_to_a_deleted_copy_counts_as_disabled()
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(_keyPath))
            key.SetValue("seeWallpaper", @"""C:\Missing folder\SeeWallpaper.App.exe"" --minimized");

        Assert.False(new StartupRegistration(_keyPath).IsEnabled);
    }

    [Theory]
    [InlineData(@"""C:\Program Files\App\app.exe"" --minimized", @"C:\Program Files\App\app.exe")]
    [InlineData(@"C:\App\app.exe --minimized", @"C:\App\app.exe")]
    [InlineData(@"C:\App\app.exe", @"C:\App\app.exe")]
    public void Executable_is_read_from_quoted_and_plain_commands(string command, string expected) =>
        Assert.Equal(expected, StartupRegistration.ExtractExecutable(command));

    public void Dispose() => Registry.CurrentUser.DeleteSubKeyTree(@"Software\seeWallpaper-tests", throwOnMissingSubKey: false);
}
