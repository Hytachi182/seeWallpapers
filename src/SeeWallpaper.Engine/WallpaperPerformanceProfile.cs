namespace SeeWallpaper.Engine;

public enum WallpaperPerformanceProfile
{
    Eco,
    Balanced,
    High
}

public static class WallpaperPerformanceProfiles
{
    public static int GetTargetFramesPerSecond(WallpaperPerformanceProfile profile) => profile switch
    {
        WallpaperPerformanceProfile.Eco => 20,
        WallpaperPerformanceProfile.Balanced => 30,
        WallpaperPerformanceProfile.High => 60,
        _ => 30
    };
}
