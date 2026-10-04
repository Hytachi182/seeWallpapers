namespace SeeWallpaper.Core;

public sealed record TemplateManifest(
    int SchemaVersion,
    string Id,
    string Name,
    string Description,
    string Author,
    string Version,
    string Category,
    string Engine,
    string Entry,
    string Preview,
    string Performance,
    IReadOnlyList<TemplateSetting> Settings);

public sealed record TemplateSetting(
    string Id,
    string Type,
    string Label,
    object? Default,
    double? Min = null,
    double? Max = null,
    double? Step = null,
    IReadOnlyList<string>? Options = null);

public sealed record InstalledTemplate(TemplateManifest Manifest, string RootPath, long SizeBytes);
