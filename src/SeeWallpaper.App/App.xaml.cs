using System.Windows;

namespace SeeWallpaper.App;

public partial class App : Application
{
    private SingleInstanceCoordinator? _instance;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        try
        {
            LaunchRequest request = LaunchRequest.Parse(e.Args);
            _instance = new SingleInstanceCoordinator();
            if (!_instance.TryAcquire())
            {
                _instance.ForwardAsync(e.Args).GetAwaiter().GetResult();
                Shutdown();
                return;
            }
            MainWindow window = new();
            MainWindow = window;
            _ = _instance.ReceiveAsync(arguments => Dispatcher.InvokeAsync(() => window.HandleLaunchAsync(LaunchRequest.Parse(arguments))).Task.Unwrap());
            window.Show();
            _ = window.HandleLaunchAsync(request);
        }
        catch (Exception exception)
        {
            MessageBox.Show(exception.Message, "Démarrage de seeWallpaper", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _instance?.Dispose();
        base.OnExit(e);
    }
}
