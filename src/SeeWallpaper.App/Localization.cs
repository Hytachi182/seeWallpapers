using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Data;
using System.Windows.Markup;

namespace SeeWallpaper.App;

/// <summary>Embedded UI translations. Identifiers and template data never depend on UI culture.</summary>
internal sealed class Localization : INotifyPropertyChanged
{
    internal static Localization Current { get; } = new();
    private readonly Dictionary<string, Dictionary<string, string>> _catalogs = SupportedLanguages.All
        .ToDictionary(language => language.Code, language => ReadCatalog(language.Code));
    private readonly Dictionary<string, string> _metadataKeys;
    private LanguagePreferences? _preferences;
    public string Language { get; private set; } = "en";
    public event PropertyChangedEventHandler? PropertyChanged;
    internal event EventHandler? LanguageChanged;
    internal IReadOnlyDictionary<string, string> English => _catalogs["en"];
    internal IReadOnlyDictionary<string, string> French => _catalogs["fr"];
    internal IReadOnlyDictionary<string, Dictionary<string, string>> Catalogs => _catalogs;

    internal Localization() => _metadataKeys = English.ToDictionary(pair => pair.Value, pair => pair.Key, StringComparer.Ordinal);

    internal void Initialize(string dataRoot, CultureInfo systemCulture)
    {
        _preferences = new LanguagePreferences(dataRoot);
        ApplyLanguage(_preferences.Load(systemCulture));
    }

    internal void ChangeLanguage(string language)
    {
        if (!SupportedLanguages.Contains(language)) throw new ArgumentOutOfRangeException(nameof(language));
        // Save before changing the UI so a failed write cannot silently lose the choice.
        _preferences?.Save(language);
        ApplyLanguage(language);
    }

    private void ApplyLanguage(string language)
    {
        Language = language;
        CultureInfo culture = CultureInfo.GetCultureInfo(SupportedLanguages.Get(language).CultureName);
        CultureInfo.DefaultThreadCurrentUICulture = culture;
        CultureInfo.CurrentUICulture = culture;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Language)));
        LanguageChanged?.Invoke(this, EventArgs.Empty);
    }

    internal string Get(string key) => _catalogs[Language].TryGetValue(key, out string? translated)
        ? translated : English.TryGetValue(key, out string? fallback) ? fallback : key;
    internal string Format(string key, params object?[] arguments) => string.Format(
        CultureInfo.GetCultureInfo(SupportedLanguages.Get(Language).CultureName), Get(key), arguments);

    internal static string T(string key) => Current.Get(key);
    internal static string F(string key, params object?[] arguments) => Current.Format(key, arguments);
    // Known bundled metadata is translated; third-party and user-authored text stays intact.
    internal static string Metadata(string source) => Current._metadataKeys.TryGetValue(source, out string? key) ? T(key) : source;

    // Binding keeps both static labels and the latest status message live across language changes.
    internal static void Set(DependencyObject target, DependencyProperty property, Func<string> text) =>
        BindingOperations.SetBinding(target, property, CreateBinding(text));

    internal static Binding CreateBinding(Func<string> text) => new(nameof(Language))
    {
        Source = Current, Mode = BindingMode.OneWay, Converter = new TextConverter(text)
    };

    private static Dictionary<string, string> ReadCatalog(string language)
    {
        using Stream stream = typeof(Localization).Assembly.GetManifestResourceStream($"SeeWallpaper.App.Languages.{language}.json")
            ?? throw new InvalidOperationException($"Missing UI language: {language}");
        return JsonSerializer.Deserialize<Dictionary<string, string>>(stream)!;
    }

    private sealed class TextConverter(Func<string> text) : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture) => text();
        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => throw new NotSupportedException();
    }
}

public sealed class TranslateExtension : MarkupExtension
{
    public string Key { get; set; } = "";
    public override object ProvideValue(IServiceProvider serviceProvider) =>
        Localization.CreateBinding(() => Localization.T(Key)).ProvideValue(serviceProvider);
}
