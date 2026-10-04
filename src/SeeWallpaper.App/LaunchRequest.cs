using System.IO;

namespace SeeWallpaper.App;

internal sealed record LaunchRequest(bool ShowScreens = false, string? PackagePath = null, bool Minimized = false)
{
    public static LaunchRequest Parse(IReadOnlyList<string> arguments)
    {
        if (arguments.Count == 0) return new();
        if (arguments.Count == 1 && arguments[0] == "--screens") return new(ShowScreens: true);
        if (arguments.Count == 1 && arguments[0] == "--minimized") return new(Minimized: true);
        string? package = arguments.Count == 2 && arguments[0] == "--import" ? arguments[1]
            : arguments.Count == 1 && !arguments[0].StartsWith("--", StringComparison.Ordinal) ? arguments[0] : null;
        if (package is null || !string.Equals(Path.GetExtension(package), ".seewall", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Utilisez --screens ou --import suivi d'un fichier .seewall.");
        return new(PackagePath: Path.GetFullPath(package));
    }
}
