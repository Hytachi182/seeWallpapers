using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;

namespace SeeWallpaper.App;

/// <summary>Stages and verifies everything before the running application is closed.</summary>
internal sealed class ApplicationUpdateInstaller(HttpClient http)
{
    internal static bool IsInstalled(string directory) => File.Exists(Path.Combine(directory, "unins000.exe"));

    public async Task<string> PrepareAsync(ApplicationUpdateResult update, string directory, string cacheRoot,
        IProgress<int>? progress = null, CancellationToken cancellationToken = default,
        string failureMessage = "The update failed. See the log for details.", string failureTitle = "seeWallpaper update")
    {
        bool installed = IsInstalled(directory);
        if (!installed && !File.Exists(Path.Combine(directory, "launch-portable.ps1")))
            throw new InvalidOperationException("Automatic updates require an installed or official portable edition.");
        ApplicationUpdateAsset asset = (installed ? update.Installer : update.Portable)
            ?? throw new InvalidDataException("The download for this edition is unavailable.");
        if (update.ChecksumsUrl is null) throw new InvalidDataException("Release checksums are missing.");
        // Probe write access before downloading or closing. Never elevate a portable update.
        string probe = Path.Combine(directory, ".update-probe-" + Guid.NewGuid().ToString("N"));
        using (File.Create(probe)) { }
        File.Delete(probe);
        string work = Path.Combine(cacheRoot, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(work);
        try
        {
            string checksums = await http.GetStringAsync(update.ChecksumsUrl, cancellationToken);
            string expected = ReadChecksum(checksums, asset.Name);
            string package = Path.Combine(work, asset.Name);
            using (HttpResponseMessage response = await http.GetAsync(asset.Url, HttpCompletionOption.ResponseHeadersRead, cancellationToken))
            {
                response.EnsureSuccessStatusCode();
                await using Stream source = await response.Content.ReadAsStreamAsync(cancellationToken);
                await using FileStream destination = new(package, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true);
                byte[] buffer = new byte[81920];
                long downloaded = 0;
                int lastPercent = -1;
                int count;
                while ((count = await source.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    downloaded += count;
                    if (downloaded > asset.Size) throw new InvalidDataException("Download exceeds its declared size.");
                    await destination.WriteAsync(buffer.AsMemory(0, count), cancellationToken);
                    int percent = (int)(downloaded * 100 / asset.Size);
                    if (percent != lastPercent) { progress?.Report(percent); lastPercent = percent; }
                }
                if (downloaded != asset.Size) throw new InvalidDataException("Incomplete download.");
            }
            await VerifyAsync(package, expected, cancellationToken);
            string? payload = null;
            if (!installed)
            {
                payload = await Task.Run(() => ExtractPortable(package, Path.Combine(work, "payload")), cancellationToken);
                Version? actual = Version.TryParse(FileVersionInfo.GetVersionInfo(Path.Combine(payload, "SeeWallpaper.App.exe")).FileVersion, out Version? parsed) ? parsed : null;
                if (actual != update.MainVersion) throw new InvalidDataException("Portable package version differs from the release.");
            }
            using Stream script = typeof(ApplicationUpdateInstaller).Assembly.GetManifestResourceStream("SeeWallpaper.App.UpdateRunner.ps1")!;
            await using (FileStream output = File.Create(Path.Combine(work, "UpdateRunner.ps1")))
                await script.CopyToAsync(output, cancellationToken);
            string config = JsonSerializer.Serialize(new
            {
                ParentId = Environment.ProcessId, Directory = Path.GetFullPath(directory), Package = package,
                Payload = payload, Installed = installed, ExpectedHash = expected, Restart = true,
                FailureMessage = failureMessage, FailureTitle = failureTitle
            });
            await File.WriteAllTextAsync(Path.Combine(work, "update.json"), config, cancellationToken);
            return work;
        }
        catch
        {
            Directory.Delete(work, recursive: true);
            throw;
        }
    }

    public static async Task StartAsync(string work, CancellationToken cancellationToken = default)
    {
        ProcessStartInfo start = new(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe"))
        { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = work };
        foreach (string argument in new[] { "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", Path.Combine(work, "UpdateRunner.ps1"), "-ConfigPath", Path.Combine(work, "update.json") })
            start.ArgumentList.Add(argument);
        using Process runner = Process.Start(start) ?? throw new IOException("Could not start the update helper.");
        try
        {
            for (int attempt = 0; attempt < 100; attempt++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (File.Exists(Path.Combine(work, "ready"))) return;
                if (runner.HasExited) throw new IOException("The update helper exited before it was ready.");
                await Task.Delay(100, cancellationToken);
            }
            throw new IOException("The update helper did not become ready.");
        }
        catch
        {
            // An abandoned helper must never install when the user later quits normally.
            if (!runner.HasExited) { runner.Kill(); await runner.WaitForExitAsync(CancellationToken.None); }
            throw;
        }
    }

    internal static string ReadChecksum(string text, string name)
    {
        string[][] entries = text.Split('\n').Select(line => line.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .Where(parts => parts.Length == 2 && parts[1] == name).ToArray();
        if (entries.Length != 1 || entries[0][0].Length != 64 || !entries[0][0].All(Uri.IsHexDigit))
            throw new InvalidDataException("Missing or ambiguous SHA-256 checksum.");
        return entries[0][0];
    }

    internal static async Task VerifyAsync(string file, string expected, CancellationToken token = default)
    {
        await using FileStream stream = File.OpenRead(file);
        byte[] actual = await SHA256.HashDataAsync(stream, token);
        if (!CryptographicOperations.FixedTimeEquals(actual, Convert.FromHexString(expected)))
            throw new InvalidDataException("The downloaded update failed SHA-256 verification.");
    }

    internal static string ExtractPortable(string zip, string destination)
    {
        using ZipArchive archive = ZipFile.OpenRead(zip);
        string root = Path.GetFullPath(destination) + Path.DirectorySeparatorChar;
        long total = 0;
        foreach (ZipArchiveEntry entry in archive.Entries)
        {
            string path = Path.GetFullPath(Path.Combine(root, entry.FullName.Replace('/', Path.DirectorySeparatorChar)));
            if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase) || entry.FullName.Contains(':')
                || ((entry.ExternalAttributes >> 16) & 0xF000) == 0xA000)
                throw new InvalidDataException("Unsafe portable archive entry.");
            total += entry.Length;
            if (total > 2L * 1024 * 1024 * 1024) throw new InvalidDataException("Portable archive is too large.");
        }
        archive.ExtractToDirectory(destination);
        string[] executables = Directory.GetFiles(destination, "SeeWallpaper.App.exe", SearchOption.AllDirectories);
        if (executables.Length != 1) throw new InvalidDataException("Portable application is missing or ambiguous.");
        string payload = Path.GetDirectoryName(executables[0])!;
        if (!File.Exists(Path.Combine(payload, "launch-portable.ps1"))) throw new InvalidDataException("Not an official portable layout.");
        return payload;
    }
}
