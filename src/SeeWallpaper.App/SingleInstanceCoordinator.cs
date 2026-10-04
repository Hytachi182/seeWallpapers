using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Security.Principal;
using System.Text.Json;

namespace SeeWallpaper.App;

internal sealed class SingleInstanceCoordinator : IDisposable
{
    private readonly string _pipeName;
    private readonly Mutex _mutex;
    private readonly CancellationTokenSource _lifetime = new();
    private bool _ownsMutex;

    public SingleInstanceCoordinator(string? instanceName = null)
    {
        _pipeName = instanceName ?? $"seeWallpaper.{WindowsIdentity.GetCurrent().User?.Value}.{Process.GetCurrentProcess().SessionId}";
        _mutex = new Mutex(false, "Local\\" + _pipeName);
    }

    public bool TryAcquire()
    {
        try { _ownsMutex = _mutex.WaitOne(0); }
        catch (AbandonedMutexException) { _ownsMutex = true; }
        return _ownsMutex;
    }

    public async Task ForwardAsync(string[] arguments)
    {
        await using NamedPipeClientStream pipe = new(".", _pipeName, PipeDirection.Out, PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
        await pipe.ConnectAsync(5000).ConfigureAwait(false);
        byte[] payload = JsonSerializer.SerializeToUtf8Bytes(arguments);
        await pipe.WriteAsync(BitConverter.GetBytes(payload.Length)).ConfigureAwait(false);
        await pipe.WriteAsync(payload).ConfigureAwait(false);
        await pipe.FlushAsync().ConfigureAwait(false);
    }

    public async Task ReceiveAsync(Func<string[], Task> handle)
    {
        while (!_lifetime.IsCancellationRequested)
        {
            try
            {
                await using NamedPipeServerStream pipe = new(_pipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
                await pipe.WaitForConnectionAsync(_lifetime.Token).ConfigureAwait(false);
                using CancellationTokenSource readTimeout = CancellationTokenSource.CreateLinkedTokenSource(_lifetime.Token);
                readTimeout.CancelAfter(TimeSpan.FromSeconds(5));
                byte[] header = new byte[4];
                await pipe.ReadExactlyAsync(header, readTimeout.Token).ConfigureAwait(false);
                int length = BitConverter.ToInt32(header);
                if (length is <= 0 or > 65536) continue;
                byte[] payload = new byte[length];
                await pipe.ReadExactlyAsync(payload, readTimeout.Token).ConfigureAwait(false);
                string[]? arguments = JsonSerializer.Deserialize<string[]>(payload);
                if (arguments is not null) await handle(arguments).ConfigureAwait(false);
            }
            catch (Exception exception) when (exception is IOException or JsonException or OperationCanceledException or ArgumentException)
            {
                // A malformed or interrupted local launch must not terminate the app.
            }
        }
    }

    public void Dispose()
    {
        _lifetime.Cancel();
        if (_ownsMutex) { _mutex.ReleaseMutex(); _ownsMutex = false; }
        _mutex.Dispose();
    }
}
