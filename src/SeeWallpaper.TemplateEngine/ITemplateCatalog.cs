using SeeWallpaper.Core;

namespace SeeWallpaper.TemplateEngine;

public interface ITemplateCatalog
{
    Task<IReadOnlyList<InstalledTemplate>> DiscoverAsync(string templatesRoot, CancellationToken cancellationToken = default);
}
