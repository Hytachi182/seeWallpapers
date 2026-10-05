using Forms = System.Windows.Forms;

namespace SeeWallpaper.App;

/// <summary>Notification area icon that keeps wallpapers running while the main window is hidden.</summary>
internal sealed class TrayIcon : IDisposable
{
    private readonly Forms.NotifyIcon _icon;
    private bool _hintShown;
    private Action? _notificationClick;

    public TrayIcon(Action open, Action openScreens, Action quit)
    {
        Forms.ContextMenuStrip menu = new();
        menu.Items.Add("Open seeWallpaper", null, (_, _) => open()).Font = new System.Drawing.Font(menu.Font, System.Drawing.FontStyle.Bold);
        menu.Items.Add("Manage displays", null, (_, _) => openScreens());
        menu.Items.Add(new Forms.ToolStripSeparator());
        menu.Items.Add("Quit and remove wallpapers", null, (_, _) => quit());
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
    }

    /// <summary>Explains once per session that closing the window keeps the app running.</summary>
    public void ShowStillRunningHint()
    {
        if (_hintShown) return;
        _hintShown = true;
        ShowNotification("seeWallpaper is still running", "Your wallpapers stay active. Right-click the icon to quit.");
    }

    /// <summary>Shows a notification; <paramref name="onClick"/> runs when the user clicks it.</summary>
    public void ShowNotification(string title, string text, Action? onClick = null)
    {
        _notificationClick = onClick;
        _icon.ShowBalloonTip(5000, title, text, Forms.ToolTipIcon.Info);
    }

    public void Dispose()
    {
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
