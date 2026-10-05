namespace SeeWallpaper.App;

internal sealed record AppLanguage(string Code, string NativeName, string CultureName);

/// <summary>One registry shared by the menu, persistence, Windows detection and formatting.</summary>
internal static class SupportedLanguages
{
    internal static IReadOnlyList<AppLanguage> All { get; } =
    [
        new("fr", "Français", "fr-FR"),
        new("en", "English", "en-US"),
        new("de", "Deutsch", "de-DE"),
        new("es", "Español", "es-ES"),
        new("lb", "Lëtzebuergesch", "lb-LU"),
        new("ro", "Română", "ro-RO"),
        new("pl", "Polski", "pl-PL"),
        new("it", "Italiano", "it-IT")
    ];

    internal static bool Contains(string code) => All.Any(language => language.Code == code);
    internal static AppLanguage Get(string code) => All.First(language => language.Code == code);
}
