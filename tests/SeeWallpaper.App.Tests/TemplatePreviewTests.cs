using System.IO;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using SeeWallpaper.App;
using SeeWallpaper.Core;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class TemplatePreviewTests
{
    [Fact]
    public void Gallery_decodes_a_small_cached_preview_and_releases_the_file()
    {
        string root = Path.Combine(Path.GetTempPath(), "seeWallpaper-preview-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            byte[] pixels = new byte[4096 * 2048 * 4];
            BitmapSource source = BitmapSource.Create(4096, 2048, 96, 96, PixelFormats.Bgra32, null, pixels, 4096 * 4);
            PngBitmapEncoder encoder = new();
            encoder.Frames.Add(BitmapFrame.Create(source));
            string path = Path.Combine(root, "preview.png");
            using (FileStream output = File.Create(path)) encoder.Save(output);
            TemplateCardViewModel card = CreateCard(root);
            BitmapImage preview = Assert.IsType<BitmapImage>(card.Preview);
            Assert.Equal(640, preview.PixelWidth);
            Assert.Equal(320, preview.PixelHeight);
            Assert.True(preview.IsFrozen);
            // Exclusive access fails on Windows if the decoder retains a file handle.
            using (FileStream exclusive = new(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { }
            File.Delete(path);
            Assert.Same(preview, card.Preview);
        }
        finally { Directory.Delete(root, true); }
    }

    [Fact]
    public void Missing_preview_keeps_the_gallery_fallback()
    {
        TemplateCardViewModel card = CreateCard(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N")));
        Assert.Null(card.Preview);
    }

    private static TemplateCardViewModel CreateCard(string root) => new(
        new InstalledTemplate(new TemplateManifest(1, "preview-test", "Preview test", "test", "tests", "1.0", "test", "web", "index.html", "preview.png", "low", []), root, 0),
        Brushes.Black, false);
}
