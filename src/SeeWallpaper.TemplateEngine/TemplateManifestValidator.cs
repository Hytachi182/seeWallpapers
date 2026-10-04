using SeeWallpaper.Core;

namespace SeeWallpaper.TemplateEngine;

public sealed class TemplateManifestValidator
{
    private static readonly HashSet<string> SettingTypes = ["boolean", "slider", "number", "color", "text", "select", "image", "file"];
    private static readonly HashSet<string> PerformanceLevels = ["low", "medium", "high"];

    public TemplateValidationResult Validate(TemplateManifest manifest, string rootPath)
    {
        List<string> errors = [];
        if (manifest.SchemaVersion != 1) errors.Add("Only schemaVersion 1 is supported.");
        if (string.IsNullOrWhiteSpace(manifest.Id) || !System.Text.RegularExpressions.Regex.IsMatch(manifest.Id, "^[a-z0-9]+(?:-[a-z0-9]+)*$")) errors.Add("id must be kebab-case.");
        if (string.IsNullOrWhiteSpace(manifest.Name)) errors.Add("name is required.");
        if (!string.Equals(manifest.Engine, "web", StringComparison.OrdinalIgnoreCase)) errors.Add("Only the web engine is supported.");
        if (!PerformanceLevels.Contains(manifest.Performance.ToLowerInvariant())) errors.Add("performance must be low, medium, or high.");
        ValidateRelativeFile(manifest.Entry, "entry", rootPath, errors);
        ValidateRelativeFile(manifest.Preview, "preview", rootPath, errors);
        foreach (TemplateSetting setting in manifest.Settings)
        {
            if (string.IsNullOrWhiteSpace(setting.Id) || string.IsNullOrWhiteSpace(setting.Label)) errors.Add("Every setting requires id and label.");
            if (!SettingTypes.Contains(setting.Type)) errors.Add($"Unsupported setting type: {setting.Type}.");
            if (setting.Type == "slider" && (setting.Min is null || setting.Max is null || setting.Step is null || setting.Min >= setting.Max)) errors.Add($"Slider {setting.Id} has an invalid range.");
        }
        return errors.Count == 0 ? TemplateValidationResult.Success() : new(false, errors);
    }

    private static void ValidateRelativeFile(string path, string field, string rootPath, ICollection<string> errors)
    {
        if (string.IsNullOrWhiteSpace(path) || Path.IsPathRooted(path) || path.Split('/', '\\').Any(part => part == "..")) { errors.Add($"{field} must be a safe relative path."); return; }
        string candidate = Path.GetFullPath(Path.Combine(rootPath, path));
        string normalizedRoot = Path.GetFullPath(rootPath).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(candidate)) errors.Add($"{field} does not exist in the template package.");
    }
}
