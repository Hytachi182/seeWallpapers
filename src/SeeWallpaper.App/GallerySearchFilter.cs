using System.Globalization;

namespace SeeWallpaper.App;

internal static class GallerySearchFilter
{
    internal static bool Matches(string name, string query) =>
        CultureInfo.InvariantCulture.CompareInfo.IndexOf(name, query.Trim(),
            CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace) >= 0;
}
