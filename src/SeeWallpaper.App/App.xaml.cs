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
            Localization.Current.Initialize(System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "seeWallpaper"), System.Globalization.CultureInfo.CurrentUICulture);
            MainWindow window = new() { StartHidden = request.Minimized };
            if (request.Minimized) { window.ShowInTaskbar = false; window.WindowState = WindowState.Minimized; }
            MainWindow = window;
            _ = _instance.ReceiveAsync(arguments => Dispatcher.InvokeAsync(() => window.HandleLaunchAsync(LaunchRequest.Parse(arguments))).Task.Unwrap());
            window.Show();
            _ = window.HandleLaunchAsync(request);
        }
        catch (Exception exception)
        {
            MessageBox.Show(exception.Message, Localization.T("SeeWallpaperStartup"), MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _instance?.Dispose();
        base.OnExit(e);
    }
}
