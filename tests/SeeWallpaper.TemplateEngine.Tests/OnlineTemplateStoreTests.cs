using System.Net;
using System.Text;
using System.Text.Json;
using SeeWallpaper.TemplateEngine;
using Xunit;

namespace SeeWallpaper.TemplateEngine.Tests;

public sealed class OnlineTemplateStoreTests : IDisposable
{
    private const string RawRoot = "https://raw.githubusercontent.com/owner/repo/HEAD/templates/";
    private readonly string _root = Path.Combine(Path.GetTempPath(), "seeWallpaper-online-tests", Guid.NewGuid().ToString("N"));
    private readonly FakeGitHub _github = new();

    [Fact]
    public void Blob_hash_matches_git()
    {
        // git hash-object of "hello\n"
        Assert.Equal("ce013625030ba8dba906f756967f9e9ca394464a", OnlineTemplateStore.ComputeBlobSha(Encoding.ASCII.GetBytes("hello\n")));
    }

    [Fact]
    public async Task Lists_valid_template_folders_and_ignores_the_rest()
    {
        _github.AddTemplate("aurora", "1.0.0");
        _github.AddFile("templates/no-manifest/index.html", "<p>");
        _github.AddFile("templates/README.md", "loose file");
        _github.AddFile("src/Other.cs", "class C {}");

        IReadOnlyList<OnlineTemplate> templates = await CreateStore().GetTemplatesAsync();

        OnlineTemplate template = Assert.Single(templates);
        Assert.Equal("aurora", template.Manifest.Id);
        Assert.Equal(RawRoot + "aurora/preview.jpg", template.PreviewUrl);
        Assert.Equal(3, template.Files.Count);
    }

    [Fact]
    public async Task Installs_a_verified_template_and_replaces_an_older_version()
    {
        string library = Path.Combine(_root, "templates");
        _github.AddTemplate("aurora", "1.0.0");
        OnlineTemplateStore store = CreateStore();
        await store.InstallAsync((await store.GetTemplatesAsync()).Single(), library);

        _github.AddTemplate("aurora", "1.1.0");
        SeeWallpaper.Core.InstalledTemplate updated = await store.InstallAsync((await store.GetTemplatesAsync()).Single(), library);

        Assert.Equal("1.1.0", updated.Manifest.Version);
        Assert.Contains("1.1.0", File.ReadAllText(Path.Combine(library, "aurora", "manifest.json")));
        Assert.Equal(["aurora"], Directory.GetDirectories(library).Select(Path.GetFileName));
        Assert.Empty(Directory.GetDirectories(Path.Combine(_root, "downloads")));
    }

    [Fact]
    public async Task Rejects_content_that_does_not_match_the_tree_and_keeps_the_installed_version()
    {
        string library = Path.Combine(_root, "templates");
        _github.AddTemplate("aurora", "1.0.0");
        OnlineTemplateStore store = CreateStore();
        await store.InstallAsync((await store.GetTemplatesAsync()).Single(), library);

        _github.AddTemplate("aurora", "1.1.0");
        OnlineTemplate listed = (await store.GetTemplatesAsync()).Single();
        _github.Tamper("templates/aurora/index.html", "<script>evil()</script>");

        await Assert.ThrowsAsync<InvalidDataException>(() => store.InstallAsync(listed, library));
        Assert.Contains("1.0.0", File.ReadAllText(Path.Combine(library, "aurora", "manifest.json")));
    }

    private OnlineTemplateStore CreateStore() => new(new HttpClient(_github), new TemplateManifestValidator(), "owner", "repo");

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }

    private sealed class FakeGitHub : HttpMessageHandler
    {
        private readonly Dictionary<string, byte[]> _tree = new(StringComparer.Ordinal);
        private readonly Dictionary<string, byte[]> _served = new(StringComparer.Ordinal);

        public void AddTemplate(string id, string version)
        {
            AddFile($"templates/{id}/manifest.json", $"{{\"schemaVersion\":1,\"id\":\"{id}\",\"name\":\"{id}\",\"description\":\"Test\",\"author\":\"seeWallpaper\",\"version\":\"{version}\",\"category\":\"Tech\",\"engine\":\"web\",\"entry\":\"index.html\",\"preview\":\"preview.jpg\",\"performance\":\"low\",\"settings\":[]}}");
            AddFile($"templates/{id}/index.html", $"<!doctype html><title>{version}</title>");
            AddFile($"templates/{id}/preview.jpg", "jpg");
        }

        public void AddFile(string path, string content) => _tree[path] = _served[path] = Encoding.UTF8.GetBytes(content);
        public void Tamper(string path, string content) => _served[path] = Encoding.UTF8.GetBytes(content);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string url = request.RequestUri!.ToString();
            if (url == "https://api.github.com/repos/owner/repo/git/trees/HEAD?recursive=1")
            {
                var entries = _tree.Select(pair => new { path = pair.Key, type = "blob", sha = OnlineTemplateStore.ComputeBlobSha(pair.Value), size = pair.Value.LongLength });
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { tree = entries, truncated = false })) });
            }
            const string rawPrefix = "https://raw.githubusercontent.com/owner/repo/HEAD/";
            if (url.StartsWith(rawPrefix, StringComparison.Ordinal) && _served.TryGetValue(url[rawPrefix.Length..], out byte[]? body))
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(body) });
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }
}
