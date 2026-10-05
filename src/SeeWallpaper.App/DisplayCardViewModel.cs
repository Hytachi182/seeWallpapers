using SeeWallpaper.Platform;
using System.ComponentModel;

namespace SeeWallpaper.App;

public sealed class DisplayCardViewModel(DisplayInfo display, int number, string currentScene, IReadOnlyList<TemplateCardViewModel> templates, string? templateId, bool isActive, bool isSpan) : INotifyPropertyChanged
{
    public DisplayInfo Display { get; } = display;
    public int Number { get; } = number;
    public string Title => Localization.F("DisplayFormat", Number) + (Display.IsPrimary ? Localization.T("Primary") : "");
    public string Details => $"{Display.Width} × {Display.Height} · Position {Display.X}, {Display.Y}";
    public string CurrentScene { get; } = currentScene;
    public IReadOnlyList<TemplateCardViewModel> Templates { get; } = templates;
    private TemplateCardViewModel? _selectedTemplate = templates.FirstOrDefault(item => string.Equals(item.Template.Manifest.Id, templateId, StringComparison.OrdinalIgnoreCase));
    public TemplateCardViewModel? SelectedTemplate
    {
        get => _selectedTemplate;
        set { if (_selectedTemplate == value) return; _selectedTemplate = value; PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(SelectedTemplate))); }
    }
    public event PropertyChangedEventHandler? PropertyChanged;
    public bool CanRemove => isActive && !isSpan;
    public string RemoveHint => isSpan ? Localization.T("InSpanModeFirstApplyAWallpaperToThisDisplayToReturnToIndependentMode") : Localization.T("RemoveFromThisDisplayOnly");
}
