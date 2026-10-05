using System.Windows.Media;
using System.Windows.Media.Imaging;
using SeeWallpaper.Core;

namespace SeeWallpaper.App;

public sealed class TemplateCardViewModel(InstalledTemplate template, Brush visual, bool isFavorite)
{
    public InstalledTemplate Template { get; } = template;
    public Brush Visual { get; } = visual;
    public bool IsFavorite { get; } = isFavorite;
    public string Name => Template.Manifest.Name;
    public string PreviewPath => System.IO.Path.Combine(Template.RootPath, Template.Manifest.Preview);
    private ImageSource? _preview;
    private bool _previewLoaded;
    public ImageSource? Preview
    {
        get
        {
            if (_previewLoaded) return _preview;
            _previewLoaded = true;
            try
            {
                // Gallery cards are 290px wide. Decode at twice that size for high-DPI
                // displays instead of keeping every full-resolution artwork in memory.
                using var stream = System.IO.File.OpenRead(PreviewPath);
                BitmapImage image = new();
                image.BeginInit();
                image.CacheOption = BitmapCacheOption.OnLoad;
                image.DecodePixelWidth = 640;
                image.StreamSource = stream;
                image.EndInit();
                image.Freeze();
                _preview = image;
            }
            catch (System.IO.IOException) { }
            catch (UnauthorizedAccessException) { }
            catch (NotSupportedException) { }
            catch (System.IO.FileFormatException) { }
            return _preview;
        }
    }
    public string Category => Localization.Metadata(Template.Manifest.Category);
    public string Description => Localization.Metadata(Template.Manifest.Description);
    public string Performance => Localization.F("PerformanceCostFormat", Localization.Metadata(char.ToUpperInvariant(Template.Manifest.Performance[0]) + Template.Manifest.Performance[1..]));
}
