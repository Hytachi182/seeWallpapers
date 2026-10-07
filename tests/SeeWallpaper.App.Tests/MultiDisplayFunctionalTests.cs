using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text.Json;
using Xunit;
using Xunit.Abstractions;

namespace SeeWallpaper.App.Tests;

[CollectionDefinition("Real desktop functional tests", DisableParallelization = true)]
public sealed class RealDesktopFunctionalCollection;

[Collection("Real desktop functional tests")]
public sealed class MultiDisplayFunctionalTests(ITestOutputHelper output)
{
    [FunctionalDesktopTheory]
    [InlineData("independent")]
    [InlineData("clone-span-local")]
    [InlineData("restore")]
    [InlineData("dpi-contexts")]
    [InlineData("reconcile")]
    public async Task Real_application_keeps_correct_content_and_full_monitor_coverage(string scenario)
    {
        string root = FindRepositoryRoot();
        string configuration = typeof(MultiDisplayFunctionalTests).Assembly.GetCustomAttribute<AssemblyConfigurationAttribute>()?.Configuration ?? "Debug";
        string runner = Environment.GetEnvironmentVariable("SEEWALLPAPER_FUNCTIONAL_RUNNER")
            ?? Path.Combine(root, "build", "desktop-check", "bin", configuration, "net8.0-windows", "DesktopCheck.dll");
        Assert.True(File.Exists(runner), $"Functional runner missing: {runner}. Build the test project first.");
        string artifacts = Path.Combine(Environment.GetEnvironmentVariable("SEEWALLPAPER_FUNCTIONAL_OUTPUT")
            ?? Path.Combine(root, "build", "functional-results", Guid.NewGuid().ToString("N")), scenario);
        ProcessStartInfo start = new(Environment.GetEnvironmentVariable("DOTNET_HOST_PATH") ?? "dotnet")
        {
            WorkingDirectory = root, UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardOutput = true, RedirectStandardError = true
        };
        foreach (string argument in new[] { runner, "--functional", "--scenario", scenario, "--output", artifacts }) start.ArgumentList.Add(argument);
        using Process process = new() { StartInfo = start };
        Assert.True(process.Start());
        Task<string> stdout = process.StandardOutput.ReadToEndAsync(), stderr = process.StandardError.ReadToEndAsync();
        using CancellationTokenSource timeout = new(TimeSpan.FromMinutes(3));
        try { await process.WaitForExitAsync(timeout.Token); }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            throw new TimeoutException($"Functional scenario '{scenario}' exceeded three minutes. Artifacts: {artifacts}");
        }
        string log = await stdout, errors = await stderr;
        output.WriteLine(log);output.WriteLine(errors);output.WriteLine($"Artifacts: {artifacts}");
        Assert.True(process.ExitCode == 0, $"{scenario} failed with exit {process.ExitCode}:\n{log}\n{errors}");
        using JsonDocument report = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(artifacts, "report.json")));
        Assert.True(report.RootElement.GetProperty("passed").GetBoolean());
        Assert.True(report.RootElement.GetProperty("displays").GetArrayLength() >= 3);
        Assert.True(report.RootElement.GetProperty("checks").GetArrayLength() > 0);
    }

    private static string FindRepositoryRoot()
    {
        DirectoryInfo? directory = new(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "seeWallpaper.sln"))) return directory.FullName;
            directory = directory.Parent;
        }
        throw new DirectoryNotFoundException("Functional tests must run from a seeWallpaper checkout.");
    }

    private sealed class FunctionalDesktopTheoryAttribute : TheoryAttribute
    {
        public FunctionalDesktopTheoryAttribute()
        {
            if (Environment.GetEnvironmentVariable("SEEWALLPAPER_FUNCTIONAL_TEST") != "1")
                Skip = "Opt-in functional test: run build/test-multi-display-functional.ps1 on a Windows workstation with three monitors.";
        }
    }
}
