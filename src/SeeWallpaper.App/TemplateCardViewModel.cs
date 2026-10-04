using System.Windows.Media;
using SeeWallpaper.Core;

namespace SeeWallpaper.App;

public sealed class TemplateCardViewModel(InstalledTemplate template, Brush visual, bool isFavorite)
{
    public InstalledTemplate Template { get; } = template;
    public Brush Visual { get; } = visual;
    public bool IsFavorite { get; } = isFavorite;
    public string Name => Template.Manifest.Name;
    public string PreviewPath => System.IO.Path.Combine(Template.RootPath, Template.Manifest.Preview);
    public string Category => Template.Manifest.Category;
    public string Description => Template.Manifest.Description;
    public string Performance => $"{char.ToUpperInvariant(Template.Manifest.Performance[0])}{Template.Manifest.Performance[1..]} cost";
}
