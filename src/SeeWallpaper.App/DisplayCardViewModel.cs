using SeeWallpaper.Platform;

namespace SeeWallpaper.App;

public sealed class DisplayCardViewModel(DisplayInfo display, int number, string currentScene, IReadOnlyList<TemplateCardViewModel> templates, string? templateId, bool isActive, bool isSpan)
{
    public DisplayInfo Display { get; } = display;
    public int Number { get; } = number;
    public string Title => $"Display {Number}" + (Display.IsPrimary ? " · Primary" : "");
    public string Details => $"{Display.Width} × {Display.Height} · Position {Display.X}, {Display.Y}";
    public string CurrentScene { get; } = currentScene;
    public IReadOnlyList<TemplateCardViewModel> Templates { get; } = templates;
    public TemplateCardViewModel? SelectedTemplate { get; set; } = templates.FirstOrDefault(item => string.Equals(item.Template.Manifest.Id, templateId, StringComparison.OrdinalIgnoreCase));
    public bool CanRemove => isActive && !isSpan;
    public string RemoveHint => isSpan ? "In span mode, first apply a wallpaper to this display to return to independent mode." : "Remove from this display only";
}
