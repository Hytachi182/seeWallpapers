using System.Windows.Media;
using SeeWallpaper.Core;

namespace SeeWallpaper.App;

public sealed record TemplateCardViewModel(InstalledTemplate Template, Brush Visual)
{
    public string Name => Template.Manifest.Name;
    public string Category => Template.Manifest.Category;
    public string Description => Template.Manifest.Description;
    public string Performance => $"{char.ToUpperInvariant(Template.Manifest.Performance[0])}{Template.Manifest.Performance[1..]} cost";
}
