using SeeWallpaper.TemplateEngine;

namespace SeeWallpaper.App;

/// <summary>A wallpaper published on GitHub that is missing locally or newer than the installed copy.</summary>
public sealed class OnlineTemplateCardViewModel(OnlineTemplate template, string? installedVersion)
{
    public OnlineTemplate Template { get; } = template;
    public bool IsUpdate => installedVersion is not null;
    public string Name => Template.Manifest.Name;
    public string PreviewUrl => Template.PreviewUrl;
    public string Category => Localization.Metadata(Template.Manifest.Category);
    public string Description => Localization.Metadata(Template.Manifest.Description);
    public string Status => IsUpdate
        ? Localization.F("UpdateAvailableVVFormat", installedVersion, Template.Manifest.Version)
        : Localization.F("NewVMBFormat", Template.Manifest.Version, Template.SizeBytes / (1024d * 1024));
    public string ActionLabel => IsUpdate ? Localization.T("Update") : Localization.T("Download");

    /// <summary>Returns the card to offer, or null when the local copy is current or belongs to another author.</summary>
    public static OnlineTemplateCardViewModel? Offer(OnlineTemplate template, SeeWallpaper.Core.TemplateManifest? installed)
    {
        if (installed is null) return new(template, null);
        bool sameAuthor = string.Equals(installed.Author, template.Manifest.Author, StringComparison.Ordinal);
        bool newer = Version.TryParse(template.Manifest.Version, out Version? online) && Version.TryParse(installed.Version, out Version? local) && online > local;
        return sameAuthor && newer ? new(template, installed.Version) : null;
    }
}
