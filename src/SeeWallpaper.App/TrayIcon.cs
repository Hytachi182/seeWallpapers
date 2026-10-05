using Forms = System.Windows.Forms;

namespace SeeWallpaper.App;

/// <summary>Notification area icon that keeps wallpapers running while the main window is hidden.</summary>
internal sealed class TrayIcon : IDisposable
{
    private readonly Forms.NotifyIcon _icon;
    private bool _hintShown;
    private Action? _notificationClick;

    private readonly Forms.ToolStripItem _openItem, _screensItem, _quitItem;
    private readonly Forms.ToolStripMenuItem? _nextItem, _pauseRotationItem;

    public TrayIcon(Action open, Action openScreens, Action quit, Action? nextWallpaper = null, Func<bool>? rotationPaused = null, Action? toggleRotation = null)
    {
        Forms.ContextMenuStrip menu = new();
        _openItem = menu.Items.Add(Localization.T("OpenSeeWallpaper"), null, (_, _) => open());
        _openItem.Font = new System.Drawing.Font(menu.Font, System.Drawing.FontStyle.Bold);
        _screensItem = menu.Items.Add(Localization.T("ManageDisplays"), null, (_, _) => openScreens());
        if (nextWallpaper is not null && rotationPaused is not null && toggleRotation is not null)
        {
            menu.Items.Add(new Forms.ToolStripSeparator());
            Forms.ToolStripMenuItem pause = new(Localization.T("PauseRotation"), null, (_, _) => toggleRotation());
            _nextItem = new Forms.ToolStripMenuItem(Localization.T("NextWallpaper"), null, (_, _) => nextWallpaper());
            _pauseRotationItem = pause;
            menu.Items.Add(_nextItem);
            menu.Items.Add(pause);
            menu.Opening += (_, _) => pause.Checked = rotationPaused();
        }
        menu.Items.Add(new Forms.ToolStripSeparator());
        _quitItem = menu.Items.Add(Localization.T("QuitAndRemoveWallpapers"), null, (_, _) => quit());
        _icon = new Forms.NotifyIcon
        {
            Icon = LoadIcon(),
            Text = "seeWallpaper",
            ContextMenuStrip = menu,
            Visible = true
        };
        _icon.MouseClick += (_, e) => { if (e.Button == Forms.MouseButtons.Left) open(); };
        _icon.BalloonTipClicked += (_, _) => _notificationClick?.Invoke();
        _icon.BalloonTipClosed += (_, _) => _notificationClick = null;
        Localization.Current.LanguageChanged += OnLanguageChanged;
    }

    private void OnLanguageChanged(object? sender, EventArgs e)
    {
        _openItem.Text = Localization.T("OpenSeeWallpaper");
        _screensItem.Text = Localization.T("ManageDisplays");
        if (_nextItem is not null) _nextItem.Text = Localization.T("NextWallpaper");
        if (_pauseRotationItem is not null) _pauseRotationItem.Text = Localization.T("PauseRotation");
        _quitItem.Text = Localization.T("QuitAndRemoveWallpapers");
    }

    /// <summary>Explains once per session that closing the window keeps the app running.</summary>
    public void ShowStillRunningHint()
    {
        if (_hintShown) return;
        _hintShown = true;
        ShowNotification(Localization.T("SeeWallpaperIsStillRunning"), Localization.T("YourWallpapersStayActiveRightClickTheIconToQuit"));
    }

    /// <summary>Shows a notification; <paramref name="onClick"/> runs when the user clicks it.</summary>
    public void ShowNotification(string title, string text, Action? onClick = null)
    {
        _notificationClick = onClick;
        _icon.ShowBalloonTip(5000, title, text, Forms.ToolTipIcon.Info);
    }

    public void Dispose()
    {
        Localization.Current.LanguageChanged -= OnLanguageChanged;
        _icon.Visible = false;
        _icon.ContextMenuStrip?.Dispose();
        _icon.Dispose();
    }

    private static System.Drawing.Icon LoadIcon()
    {
        string? path = Environment.ProcessPath;
        return (path is null ? null : System.Drawing.Icon.ExtractAssociatedIcon(path)) ?? System.Drawing.SystemIcons.Application;
    }
}
