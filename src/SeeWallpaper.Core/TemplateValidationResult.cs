namespace SeeWallpaper.Core;

public sealed record TemplateValidationResult(bool IsValid, IReadOnlyList<string> Errors)
{
    public static TemplateValidationResult Success() => new(true, Array.Empty<string>());
    public static TemplateValidationResult Failure(params string[] errors) => new(false, errors);
}
