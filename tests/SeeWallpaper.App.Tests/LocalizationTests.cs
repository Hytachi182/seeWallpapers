using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

[CollectionDefinition("UI language", DisableParallelization = true)]
public sealed class LanguageCollection;

[Collection("UI language")]
public sealed class LocalizationTests
{
    [Theory]
    [InlineData("fr", "en-US")]
    [InlineData("en", "fr-FR")]
    [InlineData("de", "en-US")]
    [InlineData("es", "fr-FR")]
    [InlineData("lb", "en-US")]
    [InlineData("ro", "fr-FR")]
    [InlineData("pl", "de-DE")]
    [InlineData("it", "es-ES")]
    public void Explicit_choice_survives_a_new_store_and_overrides_windows_language(string choice, string systemLanguage)
    {
        WithDirectory(root =>
        {
            new LanguagePreferences(root).Save(choice);
            Assert.Equal(choice, new LanguagePreferences(root).Load(CultureInfo.GetCultureInfo(systemLanguage)));
            Assert.False(File.Exists(Path.Combine(root, "language.json.tmp")));
        });
    }

    [Theory]
    [InlineData("fr-CA", "fr")]
    [InlineData("en-GB", "en")]
    [InlineData("de-DE", "de")]
    [InlineData("de-AT", "de")]
    [InlineData("es-ES", "es")]
    [InlineData("es-MX", "es")]
    [InlineData("lb-LU", "lb")]
    [InlineData("ro-RO", "ro")]
    [InlineData("ro-MD", "ro")]
    [InlineData("pl-PL", "pl")]
    [InlineData("it-IT", "it")]
    [InlineData("it-CH", "it")]
    [InlineData("nl-NL", "en")]
    public void First_launch_uses_supported_windows_language_or_english(string culture, string expected) =>
        WithDirectory(root => Assert.Equal(expected, new LanguagePreferences(root).Load(CultureInfo.GetCultureInfo(culture))));

    [Theory]
    [InlineData("not json")]
    [InlineData("{\"language\":\"xx\"}")]
    [InlineData("{\"language\":42}")]
    [InlineData("[]")]
    public void Corrupt_or_unsupported_preference_falls_back_without_breaking_startup(string data) => WithDirectory(root =>
    {
        File.WriteAllText(Path.Combine(root, "language.json"), data);
        Assert.Equal("fr", new LanguagePreferences(root).Load(CultureInfo.GetCultureInfo("fr-FR")));
    });

    [Fact]
    public void Failed_save_keeps_the_previous_language_active() => WithDirectory(root =>
    {
        Localization localization = new();
        localization.Initialize(root, CultureInfo.GetCultureInfo("en-US"));
        using FileStream locked = new(Path.Combine(root, "language.json.tmp"), FileMode.Create, FileAccess.ReadWrite, FileShare.None);
        Assert.Throws<IOException>(() => localization.ChangeLanguage("fr"));
        Assert.Equal("en", localization.Language);
    });

    [Theory]
    [InlineData("fr", "Accueil", "Écran 3")]
    [InlineData("en", "Home", "Display 3")]
    [InlineData("de", "Startseite", "Bildschirm 3")]
    [InlineData("es", "Inicio", "Pantalla 3")]
    [InlineData("lb", "Startsäit", "Bildschierm 3")]
    [InlineData("ro", "Acasă", "Ecran 3")]
    [InlineData("pl", "Strona główna", "Ekran 3")]
    [InlineData("it", "Home", "Schermo 3")]
    public void Saved_choice_is_loaded_by_a_new_localization_instance(string language, string home, string display) => WithDirectory(root =>
    {
        Localization first = new();
        first.Initialize(root, CultureInfo.GetCultureInfo("en-US"));
        first.ChangeLanguage(language);
        Localization restarted = new();
        restarted.Initialize(root, CultureInfo.GetCultureInfo("en-US"));
        Assert.Equal(language, restarted.Language);
        Assert.Equal(home, restarted.Get("Home"));
        Assert.Equal(display, restarted.Format("DisplayFormat", 3));
        Assert.Equal("unknown-key", restarted.Get("unknown-key"));
    });

    [Fact]
    public void All_catalogs_cover_the_same_messages_and_preserve_format_arguments()
    {
        Localization localization = new();
        Assert.Equal(SupportedLanguages.All.Select(language => language.Code).Order(), localization.Catalogs.Keys.Order());
        foreach (Dictionary<string, string> catalog in localization.Catalogs.Values)
        {
            Assert.Equal(localization.English.Keys.Order(), catalog.Keys.Order());
            foreach ((string key, string english) in localization.English)
            {
                string translated = catalog[key];
                Assert.False(string.IsNullOrWhiteSpace(translated), key);
                Assert.Equal(CompositeFormat.Parse(english).MinimumArgumentCount, CompositeFormat.Parse(translated).MinimumArgumentCount);
                Assert.Equal(Regex.Matches(english, @"\{\d+(?:[^}]*)\}").Select(match => match.Value).Order(),
                    Regex.Matches(translated, @"\{\d+(?:[^}]*)\}").Select(match => match.Value).Order());
                Assert.DoesNotContain('\uFFFD', translated);
                if (key != "UninstallFormat") Assert.DoesNotContain('?', translated);
            }
        }
    }

    [Fact]
    public void Existing_xaml_labels_and_dynamic_status_change_immediately_in_both_directions()
    {
        Exception? failure = null;
        Thread thread = new(() =>
        {
            string previous = Localization.Current.Language;
            try
            {
                Localization.Current.ChangeLanguage("en");
                Button button = (Button)XamlReader.Parse("""
                    <Button xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                            xmlns:local="clr-namespace:SeeWallpaper.App;assembly=SeeWallpaper.App"
                            Content="{local:Translate Key=Home}" />
                    """);
                TextBlock status = new();
                Localization.Set(status, TextBlock.TextProperty, () => Localization.F("DisplayFormat", 2));
                Assert.Equal("Home", button.Content);
                Assert.Equal("Display 2", status.Text);
                Localization.Current.ChangeLanguage("fr");
                Assert.Equal("Accueil", button.Content);
                Assert.Equal("Écran 2", status.Text);
                Assert.Equal("Couleur d’accent", Localization.Metadata("Accent color"));
                Assert.Equal("My custom scene", Localization.Metadata("My custom scene"));
                Localization.Current.ChangeLanguage("de");
                Assert.Equal("Startseite", button.Content);
                Assert.Equal("Bildschirm 2", status.Text);
                Assert.Equal("Akzentfarbe", Localization.Metadata("Accent color"));
                Localization.Current.ChangeLanguage("es");
                Assert.Equal("Inicio", button.Content);
                Assert.Equal("Pantalla 2", status.Text);
                Assert.Equal("Color de acento", Localization.Metadata("Accent color"));
                foreach ((string language, string home, string display) in new[]
                {
                    ("lb", "Startsäit", "Bildschierm 2"), ("ro", "Acasă", "Ecran 2"),
                    ("pl", "Strona główna", "Ekran 2"), ("it", "Home", "Schermo 2")
                })
                {
                    Localization.Current.ChangeLanguage(language);
                    Assert.Equal(home, button.Content);
                    Assert.Equal(display, status.Text);
                }
                Localization.Current.ChangeLanguage("en");
                Assert.Equal("Home", button.Content);
                Assert.Equal("Display 2", status.Text);
            }
            catch (Exception exception) { failure = exception; }
            finally { Localization.Current.ChangeLanguage(previous); }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(20)), "UI language check timed out.");
        if (failure is not null) throw new Exception("UI language binding failed.", failure);
    }

    private static void WithDirectory(Action<string> action)
    {
        string root = Path.Combine(Path.GetTempPath(), "seeWallpaper-language-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        CultureInfo previous = CultureInfo.CurrentUICulture;
        CultureInfo? defaultCulture = CultureInfo.DefaultThreadCurrentUICulture;
        try { action(root); }
        finally
        {
            CultureInfo.CurrentUICulture = previous;
            CultureInfo.DefaultThreadCurrentUICulture = defaultCulture;
            Directory.Delete(root, recursive: true);
        }
    }
}
