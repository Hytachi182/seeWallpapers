import importlib.util
import json
from pathlib import Path
import subprocess
import hashlib
import sys
import tempfile
import unittest
from unittest.mock import patch

BUILD = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BUILD))
from release_metadata import prepare, read_project_version
from publish_release import publish
from promote_release import run as prepare_devops, verify


class ReleaseMetadataTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="seeWallpaper-release-tests-")
        self.root = Path(self.directory.name)
        self.git("init")
        self.git("config", "user.name", "test")
        self.git("config", "user.email", "test@example.invalid")
        self.write("src/SeeWallpaper.App/SeeWallpaper.App.csproj", "<Project><PropertyGroup><Version>1.0.0</Version></PropertyGroup></Project>\n")
        self.write("README.md", "# App\n\n## Get started\n\nThe repository now targets **1.0.0**. Until publication...\n\nOne wallpapers are included.\n")
        self.write("CHANGELOG.md", "# Changelog\n\n## Unreleased\n\n## 1.0.0 - 2026-01-01\n\n- Existing release.\n")
        self.scene("first")
        self.commit("initial")
        self.git("tag", "v1.0.0")

    def tearDown(self):
        # tempfile owns this uniquely created fixture tree.
        self.directory.cleanup()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True, capture_output=True, text=True).stdout

    def write(self, path, value):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value, encoding="utf-8")

    def scene(self, scene_id, name=None, author="Creator", version="1.0.0"):
        self.write(f"templates/{scene_id}/manifest.json", json.dumps({"id": scene_id, "name": name or scene_id,
            "author": author, "version": version, "category": "Space", "description": "Animated atmosphere",
            "entry": "index.html", "preview": "preview.jpg"}))
        self.write(f"templates/{scene_id}/index.html", "<!doctype html>scene")
        self.write(f"templates/{scene_id}/preview.jpg", "fixture")

    def commit(self, message):
        self.git("add", ".")
        self.git("commit", "-m", message)

    def prepare(self, **kwargs):
        return prepare(self.root, "v1.0.0", "owner/repo", date="2026-10-05", source_commit="fixture-sha", **kwargs)

    def test_added_theme_bumps_minor_and_catalogue_contains_real_manifest_data(self):
        self.scene("second", name="Star Garden")
        self.commit("Ajout nouveau theme")
        plan = self.prepare()
        self.assertEqual("1.1.0", plan["version"])
        self.assertEqual(["second"], plan["added"])
        self.assertEqual(2, plan["template_count"])
        self.assertIn("Star Garden", (self.root / "docs/template-catalogue.md").read_text())
        self.assertIn("**2 wallpapers", (self.root / "README.md").read_text())
        self.assertIn("New wallpapers", (self.root / "docs/releases/v1.1.0.md").read_text())

    def test_updated_theme_bumps_patch_and_its_own_version(self):
        self.write("templates/first/index.html", "<!doctype html>updated scene")
        self.commit("Fix wallpaper")
        plan = self.prepare()
        self.assertEqual("1.0.1", plan["version"])
        manifest = json.loads((self.root / "templates/first/manifest.json").read_text())
        self.assertEqual("1.0.1", manifest["version"])
        self.assertEqual(["first"], plan["updated"])

    def test_explicit_theme_version_is_preserved(self):
        self.scene("first", version="2.0.0")
        self.commit("Update scene")
        self.prepare()
        self.assertEqual("2.0.0", json.loads((self.root / "templates/first/manifest.json").read_text())["version"])

    def test_pending_version_and_authored_release_limits_are_preserved(self):
        self.write("src/SeeWallpaper.App/SeeWallpaper.App.csproj", "<Project><Version>1.5.0</Version></Project>")
        self.write("docs/releases/v1.5.0.md", "# seeWallpaper 1.5.0\n\nPhysical monitor checks remain pending.\n")
        self.write("src/feature.cs", "feature")
        self.commit("App changes")
        plan = self.prepare()
        self.assertEqual("1.5.0", plan["version"])
        self.assertIn("Physical monitor checks remain pending.", (self.root / "docs/releases/v1.5.0.md").read_text())

    def test_documentation_only_has_no_new_tag_or_release_notes(self):
        self.write("docs/help.md", "Help")
        self.commit("Improve documentation")
        plan = self.prepare()
        self.assertFalse(plan["release_required"])
        self.assertEqual("1.0.0", plan["version"])
        self.assertFalse((self.root / "docs/releases/v1.0.1.md").exists())

    def test_conventional_feature_and_breaking_change_choose_versions(self):
        self.write("src/feature.cs", "feature")
        self.commit("feat(engine): add feature")
        self.assertEqual("1.1.0", self.prepare()["version"])
        self.write("src/feature.cs", "breaking")
        self.commit("feat(engine)!: change protocol")
        self.assertEqual("2.0.0", self.prepare()["version"])

    def test_author_change_fails_without_rewriting_project(self):
        self.scene("first", author="Another creator")
        self.commit("Change author")
        original = (self.root / "src/SeeWallpaper.App/SeeWallpaper.App.csproj").read_bytes()
        with self.assertRaisesRegex(ValueError, "author"):
            self.prepare()
        self.assertEqual(original, (self.root / "src/SeeWallpaper.App/SeeWallpaper.App.csproj").read_bytes())

    def test_repeated_preparation_is_idempotent_and_preserves_old_changelog(self):
        self.write("templates/first/index.html", "new animation")
        self.commit("Fix scene")
        self.prepare()
        paths = ["README.md", "CHANGELOG.md", "docs/releases/v1.0.1.md", ".github/release-plan.json",
                 "docs/template-catalogue.md", "templates/first/manifest.json"]
        first = {p: (self.root / p).read_bytes() for p in paths}
        self.prepare()
        self.assertEqual(first, {p: (self.root / p).read_bytes() for p in paths})
        self.assertIn("Existing release.", (self.root / "CHANGELOG.md").read_text())

    def test_removed_scene_appears_in_notes(self):
        self.git("rm", "-r", "templates/first")
        self.commit("Remove obsolete scene")
        plan = self.prepare()
        self.assertEqual(["first"], plan["removed"])
        self.assertIn("Removed wallpapers", (self.root / "docs/releases/v1.0.1.md").read_text())

    def test_manual_major_and_invalid_baseline(self):
        self.write("docs/help.md", "Help")
        self.commit("Docs")
        self.assertEqual("2.0.0", self.prepare(bump="major")["version"])
        with self.assertRaisesRegex(ValueError, "stable"):
            prepare(self.root, "main", "owner/repo")

    def test_invalid_manifest_id_and_version_fail(self):
        manifest_path = self.root / "templates/first/manifest.json"
        data = json.loads(manifest_path.read_text())
        data["id"] = "wrong-folder"
        self.write("templates/first/manifest.json", json.dumps(data))
        with self.assertRaisesRegex(ValueError, "folder"):
            self.prepare()
        with self.assertRaises(ValueError):
            read_project_version("<Version>1.0-beta</Version>")

    def release_assets(self):
        assets = self.root / "release-assets"
        self.write("release-assets/seeWallpaper-Setup-x64.exe", "installer fixture")
        self.write("release-assets/seeWallpaper-Portable-x64.zip", "zip fixture")
        entries = []
        for name in ["seeWallpaper-Setup-x64.exe", "seeWallpaper-Portable-x64.zip"]:
            entries.append(hashlib.sha256((assets / name).read_bytes()).hexdigest() + "  " + name)
        self.write("release-assets/SHA256SUMS.txt", "\n".join(entries) + "\n")
        self.write("docs/releases/v1.0.0.md", "# Release\n\nSee [readiness](../readiness.md).\n")
        return assets

    def test_publication_rejects_wrong_checksums_without_creating_tag(self):
        assets = self.release_assets()
        self.write("release-assets/seeWallpaper-Setup-x64.exe", "corrupted")
        with patch("publish_release.git") as git_call, patch("publish_release.gh") as gh_call:
            with self.assertRaisesRegex(ValueError, "checksum"):
                publish(self.root, "owner/repo", "1.0.0", assets)
            git_call.assert_not_called()
            gh_call.assert_not_called()

    def test_publication_never_moves_a_tag_to_another_commit(self):
        assets = self.release_assets()
        def fake_git(root, *args, **kwargs):
            if args[:2] == ("rev-parse", "HEAD"):
                return "new-commit\n"
            if args[:2] == ("rev-parse", "--verify"):
                return "old-commit\n"
            return ""
        with patch("publish_release.git", side_effect=fake_git) as git_call, patch("publish_release.gh") as gh_call:
            with self.assertRaisesRegex(ValueError, "never moved"):
                publish(self.root, "owner/repo", "1.0.0", assets)
            self.assertFalse(any(call.args[1] == "push" for call in git_call.call_args_list))
            gh_call.assert_not_called()

    def test_successful_publication_creates_draft_before_upload_and_publishes_last(self):
        assets = self.release_assets()
        def fake_git(root, *args, **kwargs):
            if args[:2] == ("rev-parse", "HEAD"):
                return "reviewed-commit\n"
            if args[:2] == ("rev-parse", "--verify"):
                return None
            return ""
        def fake_gh(*args, **kwargs):
            if args[:2] == ("api", "repos/owner/repo/releases/tags/v1.0.0"):
                return None
            if args[:2] == ("api", "repos/owner/repo/releases/latest"):
                return json.dumps({"tag_name": "v0.9.0"})
            return ""
        with patch("publish_release.git", side_effect=fake_git), patch("publish_release.gh", side_effect=fake_gh) as gh_call:
            publish(self.root, "owner/repo", "1.0.0", assets)
            calls = [call.args for call in gh_call.call_args_list]
            create = next(i for i, args in enumerate(calls) if args[:2] == ("release", "create"))
            upload = next(i for i, args in enumerate(calls) if args[:2] == ("release", "upload"))
            final = next(i for i, args in enumerate(calls) if "--draft=false" in args)
            self.assertIn("--draft", calls[create])
            self.assertLess(create, upload)
            self.assertLess(upload, final)
            self.assertIn("--latest=true", calls[final])

    def test_older_release_never_replaces_newer_latest_release(self):
        assets = self.release_assets()
        def fake_git(root, *args, **kwargs):
            if args[:2] == ("rev-parse", "HEAD"):
                return "reviewed-commit\n"
            if args[:2] == ("rev-parse", "--verify"):
                return None
            return ""
        def fake_gh(*args, **kwargs):
            return json.dumps({"tag_name": "v2.0.0"}) if args[:2] == ("api", "repos/owner/repo/releases/latest") else None
        with patch("publish_release.git", side_effect=fake_git), patch("publish_release.gh", side_effect=fake_gh) as gh_call:
            publish(self.root, "owner/repo", "1.0.0", assets)
            final = next(call.args for call in gh_call.call_args_list if "--draft=false" in call.args)
            self.assertIn("--latest=false", final)

    def test_preparation_pushes_metadata_to_devops_without_creating_another_pr(self):
        with tempfile.TemporaryDirectory(prefix="seeWallpaper-bare-remote-") as remote:
            subprocess.run(["git", "init", "--bare", remote], check=True, capture_output=True)
            self.git("branch", "-M", "main")
            self.git("checkout", "-b", "devops")
            self.git("remote", "add", "origin", remote)
            self.write("src/feature.cs", "feature")
            self.commit("feat: new application feature")
            self.git("push", "origin", "main", "devops", "--tags")
            source = self.git("rev-parse", "HEAD").strip()
            def fake_gh(*args, **kwargs):
                if args[0] == "api":
                    return json.dumps({"tag_name": "v1.0.0", "draft": False, "prerelease": False})
                return ""
            with patch("promote_release.gh", side_effect=fake_gh) as gh_call:
                plan = prepare_devops(self.root, "owner/repo", expected_source=source)
                self.assertEqual("1.1.0", plan["version"])
                head = self.git("rev-parse", "HEAD").strip()
                self.assertNotEqual(source, head)
                self.assertEqual(head, self.git("rev-parse", "origin/devops").strip())
                self.assertEqual(plan, verify(self.root))
                # Squash merges rewrite source ancestry. Validate the reviewed PR
                # head while reading the metadata from the merged main snapshot.
                self.git("checkout", "main")
                self.git("merge", "--squash", "devops")
                self.git("commit", "-m", "Merge devops PR using squash")
                self.assertEqual(plan, verify(self.root, head))
                self.git("checkout", "devops")
                self.assertFalse(any(call.args[0] == "pr" for call in gh_call.call_args_list))
                self.assertIn(("workflow", "run", "ci.yml", "--repo", "owner/repo", "--ref", "devops",
                               "-f", "check_ref=" + head), [call.args for call in gh_call.call_args_list])
                prepare_devops(self.root, "owner/repo")
                self.assertEqual(head, self.git("rev-parse", "HEAD").strip())
                self.write("src/feature.cs", "another change")
                self.commit("Change feature after preparation")
                with self.assertRaisesRegex(ValueError, "changed after"):
                    verify(self.root)

    def test_preparation_refuses_a_superseded_push(self):
        with patch("promote_release.git", side_effect=["", "newer-source\n"]) as git_call, patch("promote_release.gh") as gh_call:
            with self.assertRaisesRegex(RuntimeError, "newer push"):
                prepare_devops(self.root, "owner/repo", expected_source="old-source")
            gh_call.assert_not_called()
            self.assertFalse(any(call.args[1] == "push" for call in git_call.call_args_list))

    def test_preparation_refuses_a_main_release_still_awaiting_publication(self):
        pending = json.dumps({"release_required": True, "version": "1.1.0"})
        latest = json.dumps({"tag_name": "v1.0.0", "draft": False, "prerelease": False})
        with patch("promote_release.git", side_effect=["", "source\n", pending]) as git_call, patch("promote_release.gh", return_value=latest):
            with self.assertRaisesRegex(ValueError, "awaiting publication"):
                prepare_devops(self.root, "owner/repo")
            self.assertFalse(any(call.args[1] == "push" for call in git_call.call_args_list))

    def test_publication_does_not_restart_preparation_or_create_a_pr(self):
        assets = self.release_assets()
        def fake_git(root, *args, **kwargs):
            if args[:2] == ("rev-parse", "HEAD"):
                return "reviewed-commit\n"
            if args[:2] == ("rev-parse", "--verify"):
                return None
            return ""
        with patch("publish_release.git", side_effect=fake_git), patch("publish_release.gh", return_value=None) as gh_call:
            publish(self.root, "owner/repo", "1.0.0", assets)
            self.assertFalse(any(call.args[0] in {"workflow", "pr"} for call in gh_call.call_args_list))


if __name__ == "__main__":
    unittest.main()
