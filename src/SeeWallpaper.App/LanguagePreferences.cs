using System.Globalization;
using System.IO;
using System.Text.Json;

namespace SeeWallpaper.App;

/// <summary>Stores only the user's UI language, independently of wallpaper settings.</summary>
internal sealed class LanguagePreferences(string dataRoot)
{
    private readonly string _path = Path.Combine(dataRoot, "language.json");

    internal string Load(CultureInfo systemCulture)
    {
        try
        {
            if (File.Exists(_path))
            {
                using JsonDocument document = JsonDocument.Parse(File.ReadAllText(_path));
                if (document.RootElement.TryGetProperty("language", out JsonElement value) && value.ValueKind == JsonValueKind.String
                    && value.GetString() is string saved && SupportedLanguages.Contains(saved)) return saved;
            }
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException or InvalidOperationException) { }
        string language = systemCulture.TwoLetterISOLanguageName;
        return SupportedLanguages.Contains(language) ? language : "en";
    }

    internal void Save(string language)
    {
        if (!SupportedLanguages.Contains(language)) throw new ArgumentOutOfRangeException(nameof(language));
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        string temporary = _path + ".tmp";
        try
        {
            File.WriteAllText(temporary, JsonSerializer.Serialize(new { language }));
            File.Move(temporary, _path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }
}
