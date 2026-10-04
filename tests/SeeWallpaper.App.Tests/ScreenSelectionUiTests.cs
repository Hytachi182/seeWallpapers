using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using SeeWallpaper.App;
using SeeWallpaper.Platform;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class ScreenSelectionUiTests
{
    [Fact]
    public void Screen_selection_uses_explicit_targets_and_disables_install_when_none_are_selected()
    {
        Exception? failure = null;
        Thread thread = new(() =>
        {
            try
            {
                global::SeeWallpaper.App.App application = new();
                application.InitializeComponent();
                DisplayCardViewModel[] displays = Enumerable.Range(1, 3).Select(number => new DisplayCardViewModel(
                    new DisplayInfo($"display-{number}", $"display-{number}", number == 1, 1920, 1080, (number - 1) * 1920),
                    number, number == 2 ? "Actif : Sakura Night" : "Aucun screener installé sur cet écran", [], null, number == 2, false)).ToArray();
                int identifications = 0;
                ApplyModeWindow dialog = new(displays, "Digital Rain 3D", () => identifications++);
                Assert.NotNull(dialog.Icon);
                FrameworkElement content = (FrameworkElement)dialog.Content;
                CheckBox[] choices = Descendants(content).OfType<CheckBox>().ToArray();
                Button install = Descendants(content).OfType<Button>().Single(button => button.IsDefault);
                Assert.Equal("display-1", Assert.Single(dialog.SelectedDisplays).Id);
                choices[0].IsChecked = false;
                Assert.Empty(dialog.SelectedDisplays);
                Assert.False(install.IsEnabled);
                choices[1].IsChecked = true;
                choices[2].IsChecked = true;
                Assert.True(install.IsEnabled);
                Assert.Equal(new[] { "display-2", "display-3" }, dialog.SelectedDisplays.Select(display => display.Id));
                Descendants(content).OfType<Button>().Single(button => Equals(button.Content, "Identifier les écrans")).RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
                Assert.Equal(1, identifications);
                Capture(content, "screen-selection.png", 552, 560);

                ComboBox mode = Assert.Single(Descendants(content).OfType<ComboBox>());
                mode.SelectedIndex = 1;
                Assert.Equal(WallpaperApplicationMode.Clone, dialog.SelectedMode);
                Assert.All(choices, choice => Assert.False(choice.IsEnabled));
                mode.SelectedIndex = 2;
                Assert.Equal(WallpaperApplicationMode.Span, dialog.SelectedMode);
                mode.SelectedIndex = 0;
                Assert.Equal(new[] { "display-2", "display-3" }, dialog.SelectedDisplays.Select(display => display.Id));
                dialog.Close();

                ApplyModeWindow empty = new([], "Scene", () => { });
                Assert.False(Descendants((FrameworkElement)empty.Content).OfType<Button>().Single(button => button.IsDefault).IsEnabled);
                empty.Close();
                if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SEEWALLPAPER_VISUAL_REVIEW")))
                {
                    MainWindow main = new();
                    Assert.NotNull(main.Icon);
                    string templatesRoot = Path.Combine(AppContext.BaseDirectory, "templates");
                    var catalog = new SeeWallpaper.TemplateEngine.FileTemplateCatalog(new SeeWallpaper.TemplateEngine.TemplateManifestValidator());
                    TemplateCardViewModel[] templates = catalog.DiscoverAsync(templatesRoot).GetAwaiter().GetResult()
                        .Select(template => new TemplateCardViewModel(template, Brushes.Black, false)).ToArray();
                    typeof(MainWindow).GetField("_templates", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.SetValue(main, templates);
                    ((ItemsControl)main.FindName("TemplateList")).ItemsSource = templates;
                    Capture((FrameworkElement)main.Content, "screen-gallery.png", 1240, 750);
                    typeof(MainWindow).GetMethod("ShowScreens", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.Invoke(main, null);
                    Capture((FrameworkElement)main.Content, "screen-management.png", 980, 600);
                    ((Button)main.FindName("AboutButton")).RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
                    Assert.Equal(Visibility.Visible, ((ScrollViewer)main.FindName("AboutView")).Visibility);
                    Assert.Equal(Visibility.Collapsed, ((ScrollViewer)main.FindName("ScreensView")).Visibility);
                    Assert.Equal(Visibility.Collapsed, ((FrameworkElement)main.FindName("PageActions")).Visibility);
                    Assert.Contains("Michael Ruffenach", Descendants((DependencyObject)main.FindName("AboutView")).OfType<TextBlock>().Select(block => block.Text));
                    Assert.Contains(typeof(MainWindow).Assembly.GetName().Version!.ToString(3), ((TextBlock)main.FindName("AboutVersion")).Text);
                    Capture((FrameworkElement)main.Content, "about-desktop.png", 1240, 750);
                    Capture((FrameworkElement)main.Content, "about-compact.png", 980, 600);
                    ((ScrollViewer)main.FindName("AboutView")).ScrollToEnd();
                    Capture((FrameworkElement)main.Content, "about-features.png", 980, 600);
                    Descendants((DependencyObject)main.FindName("AboutView")).OfType<Button>().Single(button => Equals(button.Content, "Découvrir les screeners")).RaiseEvent(new RoutedEventArgs(Button.ClickEvent));
                    Assert.Equal(Visibility.Collapsed, ((ScrollViewer)main.FindName("AboutView")).Visibility);
                    Assert.Equal(Visibility.Visible, ((ScrollViewer)main.FindName("GalleryView")).Visibility);
                    main.Close();
                }
                application.Shutdown();
            }
            catch (Exception exception) { failure = exception; }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(20)), "WPF selection verification timed out.");
        if (failure is not null) System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(failure).Throw();
    }

    private static IEnumerable<DependencyObject> Descendants(DependencyObject parent)
    {
        // Logical children remain accessible before the native window is shown.
        foreach (object child in LogicalTreeHelper.GetChildren(parent))
            if (child is DependencyObject dependency)
            {
                yield return dependency;
                foreach (DependencyObject nested in Descendants(dependency)) yield return nested;
            }
    }

    private static void Capture(FrameworkElement content, string name, int width, int height)
    {
        string? directory = Environment.GetEnvironmentVariable("SEEWALLPAPER_VISUAL_REVIEW");
        if (string.IsNullOrWhiteSpace(directory)) return;
        content.Measure(new Size(width, height));
        content.Arrange(new Rect(0, 0, width, height));
        content.UpdateLayout();
        RenderTargetBitmap bitmap = new(width, height, 96, 96, PixelFormats.Pbgra32);
        DrawingVisual surface = new();
        using (DrawingContext drawing = surface.RenderOpen())
        {
            drawing.DrawRectangle((Brush)Application.Current.FindResource("Canvas"), null, new Rect(0, 0, width, height));
        }
        bitmap.Render(surface);
        bitmap.Render(content);
        Directory.CreateDirectory(directory);
        PngBitmapEncoder encoder = new();
        encoder.Frames.Add(BitmapFrame.Create(bitmap));
        using FileStream stream = File.Create(Path.Combine(directory, name));
        encoder.Save(stream);
    }
}
