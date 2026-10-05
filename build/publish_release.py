"""Publish already verified assets, keeping tags and stable releases immutable."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

from promote_release import gh
from release_metadata import git, read_project_version, version

ASSETS = {"seeWallpaper-Setup-x64.exe", "seeWallpaper-Portable-x64.zip", "SHA256SUMS.txt"}


def publish(root, repository, release_version, assets):
    version(release_version)
    if read_project_version(Path(root, "src/SeeWallpaper.App/SeeWallpaper.App.csproj").read_text()) != release_version:
        raise ValueError("The packaged application version does not match the release")
    tag = "v" + release_version
    assets = Path(assets).resolve()
    for name in ASSETS:
        if not (assets / name).is_file():
            raise ValueError(f"Missing release asset: {name}")
    checksums = (assets / "SHA256SUMS.txt").read_text(encoding="ascii")
    entries = {line.split()[1]: line.split()[0] for line in checksums.splitlines() if line.strip()}
    if set(entries) != ASSETS - {"SHA256SUMS.txt"}:
        raise ValueError("Unexpected checksum entries")
    for name, expected in entries.items():
        with (assets / name).open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if digest != expected:
            raise ValueError(f"Release checksum mismatch: {name}")
    git(root, "fetch", "origin", "main", "--tags")
    head = git(root, "rev-parse", "HEAD").strip()
    if git(root, "merge-base", "--is-ancestor", head, "origin/main", optional=True) is None:
        raise ValueError("Only a commit reviewed and merged into main can be published")
    tagged = git(root, "rev-parse", "--verify", f"{tag}^{{commit}}", optional=True)
    if tagged and tagged.strip() != head:
        raise ValueError(f"{tag} already points to another commit; tags are never moved")
    notes_path = Path(root, f"docs/releases/{tag}.md")
    notes = notes_path.read_text(encoding="utf-8")
    if not notes.strip():
        raise ValueError("Release notes are empty")
    existing = gh("api", f"repos/{repository}/releases/tags/{tag}", optional=True)
    if existing:
        release = json.loads(existing)
        if not release["draft"]:
            if release["prerelease"] or not ASSETS.issubset({asset["name"] for asset in release["assets"]}):
                raise ValueError("Existing published release does not match the expected stable asset set")
            with tempfile.TemporaryDirectory(prefix="seeWallpaper-release-check-") as directory:
                gh("release", "download", tag, "--repo", repository, "--pattern", "SHA256SUMS.txt", "--dir", directory)
                if Path(directory, "SHA256SUMS.txt").read_text(encoding="ascii") != checksums:
                    raise ValueError("Existing stable assets differ; create a new version instead of overwriting them")
            print(f"{tag} is already published with the expected assets; nothing overwritten.")
            gh("workflow", "run", "promote.yml", "--repo", repository, "--ref", "main", "-f", "bump=auto", "-f", "dry_run=false")
            return
    # Resolve local documentation links for the GitHub release page.
    def link(match):
        destination = match[2]
        if re.match(r"[a-zA-Z]+://", destination) or destination.startswith("#"):
            return match[0]
        path, separator, anchor = destination.partition("#")
        resolved = (notes_path.parent / path).resolve().relative_to(Path(root).resolve()).as_posix()
        return f"[{match[1]}](https://github.com/{repository}/blob/{tag}/{resolved}{separator}{anchor})"
    notes = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, notes)
    with tempfile.TemporaryDirectory(prefix="seeWallpaper-release-notes-") as directory:
        notes_file = Path(directory, "notes.md")
        notes_file.write_text(notes, encoding="utf-8")
        if not tagged:
            git(root, "tag", "-a", tag, "-m", f"seeWallpaper {release_version}", head)
            git(root, "push", "origin", f"refs/tags/{tag}")
        if not existing:
            gh("release", "create", tag, "--repo", repository, "--verify-tag", "--draft",
               "--title", f"seeWallpaper {release_version}", "--notes-file", str(notes_file))
        else:
            gh("release", "edit", tag, "--repo", repository, "--title", f"seeWallpaper {release_version}",
               "--notes-file", str(notes_file))
        gh("release", "upload", tag, *[str(assets / name) for name in sorted(ASSETS)], "--repo", repository, "--clobber")
        latest = gh("api", f"repos/{repository}/releases/latest", optional=True)
        make_latest = not latest or version(json.loads(latest)["tag_name"].removeprefix("v")) < version(release_version)
        gh("release", "edit", tag, "--repo", repository, "--draft=false", "--prerelease=false",
           "--latest=" + str(make_latest).lower())
    print(f"Published {tag} from reviewed commit {head}.")
    # Catch up changes queued on devops while the previous version was packaging.
    gh("workflow", "run", "promote.yml", "--repo", repository, "--ref", "main", "-f", "bump=auto", "-f", "dry_run=false")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--assets", required=True)
    args = parser.parse_args()
    publish(Path(__file__).resolve().parent.parent, args.repository, args.version, args.assets)
