using System.IO;
using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class LaunchRequestTests
{
    [Fact]
    public void Shell_commands_open_screens_and_preserve_package_paths_with_spaces()
    {
        Assert.True(LaunchRequest.Parse(["--screens"]).ShowScreens);
        string path = Path.Combine(Path.GetTempPath(), "a folder", "my scene.seewall");
        Assert.Equal(path, LaunchRequest.Parse(["--import", path]).PackagePath);
        Assert.Equal(path, LaunchRequest.Parse([path]).PackagePath);
        Assert.True(LaunchRequest.Parse(["--minimized"]).Minimized);
    }

    [Theory]
    [InlineData("--import", "scene.exe")]
    [InlineData("--import", "")]
    [InlineData("--screens", "another-option")]
    public void Unsupported_commands_and_non_packages_are_rejected(string first, string second) =>
        Assert.Throws<ArgumentException>(() => LaunchRequest.Parse([first, second]));

    [Fact]
    public async Task A_second_instance_forwards_its_shell_request_to_the_first_instance()
    {
        TaskCompletionSource finished = new(TaskCreationOptions.RunContinuationsAsynchronously);
        Thread owner = new(() =>
        {
        try
        {
        string name = "seeWallpaper.test." + Guid.NewGuid().ToString("N");
        using SingleInstanceCoordinator primary = new(name);
        Assert.True(primary.TryAcquire());
        TaskCompletionSource<string[]> received = new(TaskCreationOptions.RunContinuationsAsynchronously);
        Task receive = primary.ReceiveAsync(arguments => { received.TrySetResult(arguments); return Task.CompletedTask; });
        Exception? failure = null;
        Thread sender = new(() =>
        {
            try
            {
                using SingleInstanceCoordinator secondary = new(name);
                Assert.False(secondary.TryAcquire());
                secondary.ForwardAsync(["--import", @"C:\my scenes\example.seewall"]).GetAwaiter().GetResult();
            }
            catch (Exception exception) { failure = exception; }
        });
        sender.Start();
        Assert.True(sender.Join(TimeSpan.FromSeconds(10)));
        if (failure is not null) System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(failure).Throw();
        Assert.Equal(new[] { "--import", @"C:\my scenes\example.seewall" }, received.Task.WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult());
        primary.Dispose();
        receive.WaitAsync(TimeSpan.FromSeconds(5)).GetAwaiter().GetResult();
        finished.TrySetResult();
        }
        catch (Exception exception) { finished.TrySetException(exception); }
        });
        owner.Start();
        await finished.Task.WaitAsync(TimeSpan.FromSeconds(30));
    }
}
