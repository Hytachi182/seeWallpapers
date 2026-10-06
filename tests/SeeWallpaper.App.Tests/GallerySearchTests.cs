using SeeWallpaper.App;
using Xunit;

namespace SeeWallpaper.App.Tests;

public sealed class GallerySearchTests
{
    [Theory]
    [InlineData("Rain on Glass", "RAIN", true)]
    [InlineData("Meteor Shower", "eor sh", true)]
    [InlineData("For\u00eat", "foret", true)]
    [InlineData("Winter Snowfall", "  snow  ", true)]
    [InlineData("Tiny City", "", true)]
    [InlineData("Tiny City", "   ", true)]
    [InlineData("Pixel Island", "snow", false)]
    [InlineData("Robot Factory", "rbt", false)]
    public void Search_matches_a_contiguous_part_of_the_name(string name, string query, bool expected) =>
        Assert.Equal(expected, GallerySearchFilter.Matches(name, query));
}
