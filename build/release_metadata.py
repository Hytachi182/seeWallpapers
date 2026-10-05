"""Prepare reviewable release metadata from Git changes and scene manifests."""
import argparse
import datetime
import html
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import quote

PROJECT = Path("src/SeeWallpaper.App/SeeWallpaper.App.csproj")
START, END = "<!-- generated-release:start -->", "<!-- generated-release:end -->"


def git(root, *args, optional=False):
    result = subprocess.run(["git", "-c", "core.quotepath=false", *args], cwd=root, text=True, encoding="utf-8",
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode and not optional:
        raise RuntimeError(result.stderr.strip())
    return result.stdout if result.returncode == 0 else None


def version(value):
    if not re.fullmatch(r"\d+\.\d+\.\d+", value):
        raise ValueError(f"Expected X.Y.Z version, got {value!r}")
    return tuple(map(int, value.split(".")))


def increment(value, bump):
    major, minor, patch = version(value)
    return {"major": f"{major + 1}.0.0", "minor": f"{major}.{minor + 1}.0",
            "patch": f"{major}.{minor}.{patch + 1}"}[bump]


def read_project_version(text):
    match = re.search(r"<Version>([^<]+)</Version>", text)
    if not match:
        raise ValueError("Application Version is missing")
    version(match[1])
    return match[1]


def load_manifests(root, ref=None):
    paths = (git(root, "ls-tree", "-r", "--name-only", ref, "--", "templates").splitlines()
             if ref else [p.relative_to(root).as_posix() for p in Path(root, "templates").glob("*/manifest.json")])
    manifests = {}
    for path in paths:
        if not re.fullmatch(r"templates/[^/]+/manifest\.json", path):
            continue
        text = git(root, "show", f"{ref}:{path}") if ref else Path(root, path).read_text(encoding="utf-8-sig")
        scene = json.loads(text)
        scene_id = path.split("/")[1]
        if scene.get("id") != scene_id:
            raise ValueError(f"Template ID does not match its folder: {path}")
        version(scene["version"])
        manifests[scene_id] = scene
    return manifests


def markdown(value):
    return str(value).replace("\n", " ").replace("\r", " ").replace("|", "\\|").replace("[", "\\[").replace("]", "\\]")


def write(root, path, content):
    target = Path(root, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def generated_block(text, body):
    block = f"{START}\n{body.rstrip()}\n{END}"
    if START in text:
        if END not in text:
            raise ValueError("Incomplete generated release marker")
        return re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S).rstrip() + "\n"
    return text.rstrip() + "\n\n" + block + "\n"


def prepare(root, base_ref, repository, bump="auto", date=None, source_commit=None):
    root = Path(root).resolve()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Expected owner/repository")
    if not re.fullmatch(r"v\d+\.\d+\.\d+", base_ref):
        raise ValueError("The baseline must be a stable vX.Y.Z tag")
    base_version = base_ref[1:]
    version(base_version)
    changed = git(root, "diff", "--name-only", base_ref, "HEAD").splitlines()
    old, scenes = load_manifests(root, base_ref), load_manifests(root)
    added, removed = sorted(scenes.keys() - old.keys()), sorted(old.keys() - scenes.keys())
    updated = sorted(scene_id for scene_id in scenes.keys() & old.keys()
                     if any(p.startswith(f"templates/{scene_id}/") for p in changed))
    project_text = (root / PROJECT).read_text(encoding="utf-8-sig")
    current_version = read_project_version(project_text)
    if version(current_version) < version(base_version):
        raise ValueError("Application version is older than the latest published release")
    messages = git(root, "log", "--format=%s", f"{base_ref}..HEAD").splitlines()
    messages = list(dict.fromkeys(m for m in messages if not m.startswith(("Merge ", "chore(release):"))))
    release_required = (version(current_version) > version(base_version) or
                        any(p.startswith(("src/", "templates/", "installer/")) or p == "Directory.Build.props"
                            or (p.startswith("build/") and p.endswith(".ps1")) for p in changed))
    if bump != "auto":
        release_required = True
    bodies = git(root, "log", "--format=%B", f"{base_ref}..HEAD")
    detected_bump = ("major" if "BREAKING CHANGE:" in bodies or re.search(r"(?m)^\w+(?:\([^\n]+\))?!:", bodies)
                     else "minor" if added or any(re.match(r"feat(?:\([^)]*\))?:", m) for m in messages) else "patch")
    requested = increment(base_version, detected_bump if bump == "auto" else bump)
    target_version = (max((current_version, requested), key=version) if release_required else current_version)
    for scene_id in updated:
        if scenes[scene_id].get("author") != old[scene_id].get("author"):
            raise ValueError(f"Update changed the author of {scene_id}; review ownership before publication")
    if release_required:
        write(root, PROJECT, re.sub(r"<Version>[^<]+</Version>", f"<Version>{target_version}</Version>", project_text, count=1))
        for scene_id in updated:
            if version(scenes[scene_id]["version"]) <= version(old[scene_id]["version"]):
                scenes[scene_id]["version"] = increment(old[scene_id]["version"], "patch")
                write(root, f"templates/{scene_id}/manifest.json", json.dumps(scenes[scene_id], indent=2, ensure_ascii=False))

    count = len(scenes)
    catalogue = ["# Wallpaper catalogue", "", f"**{count} built-in wallpapers.** Generated from the scene manifests.", "",
                 "| Preview | Wallpaper | Category | Creator | Version |", "| --- | --- | --- | --- | --- |"]
    for scene_id, scene in sorted(scenes.items(), key=lambda pair: (pair[1].get("category", ""), pair[1]["name"])):
        preview = quote(f"../templates/{scene_id}/{scene['preview']}", safe="/.")
        image = f'<img src="{preview}" alt="{html.escape(scene["name"], quote=True)}" width="160" />'
        name = f'**{markdown(scene["name"])}**<br />{markdown(scene.get("description", ""))}'
        catalogue.append(f'| {image} | {name} | {markdown(scene.get("category", ""))} | {markdown(scene.get("author", ""))} | {scene["version"]} |')
    write(root, "docs/template-catalogue.md", "\n".join(catalogue))

    readme_path = root / "README.md"
    readme = readme_path.read_text(encoding="utf-8-sig")
    summary = f"**{count} wallpapers are included.** Browse the [complete catalogue](docs/template-catalogue.md) for scene names, previews, creators, and versions."
    a, b = "<!-- template-summary:start -->", "<!-- template-summary:end -->"
    summary = f"{a}\n{summary}\n{b}"
    if a in readme:
        if b not in readme:
            raise ValueError("Incomplete template summary marker")
        readme = re.sub(re.escape(a) + r".*?" + re.escape(b), lambda _: summary, readme, flags=re.S)
    else:
        readme, count_matches = re.subn(r"(?m)^.*wallpapers are included\..*$", lambda _: summary, readme, count=1)
        if not count_matches:
            raise ValueError("README wallpaper summary could not be located")
    # A source version may be merged while packaging is still in progress.
    release_info = (f"Source version: **{target_version}**. Download buttons follow the latest published stable release. "
                    "A newer source version becomes available for download only after its Windows packages are published.")
    a, b = "<!-- release-info:start -->", "<!-- release-info:end -->"
    info = f"{a}\n{release_info}\n{b}"
    if a in readme:
        readme = re.sub(re.escape(a) + r".*?" + re.escape(b), lambda _: info, readme, flags=re.S)
    else:
        readme, matches = re.subn(r"(?m)^The repository now targets \*\*.*?$", lambda _: info, readme, count=1)
        if not matches:
            readme = readme.replace("## Get started\n", "## Get started\n\n" + info + "\n", 1)
    write(root, "README.md", readme)

    notes = ["## Changes since " + base_ref, "", f"Built-in catalogue: **{count} wallpapers**.", ""]
    for title, ids, lookup in (("New wallpapers", added, scenes), ("Updated wallpapers", updated, scenes), ("Removed wallpapers", removed, old)):
        if ids:
            notes.extend(["### " + title, ""])
            for scene_id in ids:
                scene = lookup[scene_id]
                notes.append(f'- **{markdown(scene["name"])}** (`{scene_id}`): {markdown(scene.get("description", ""))}')
            notes.append("")
    if messages:
        notes.extend(["### Development changes", ""] + [f"- {markdown(m)}" for m in messages] + [""])
    notes.append(f"[Full comparison](https://github.com/{repository}/compare/{base_ref}...v{target_version})")
    body = "\n".join(notes)
    if release_required:
        notes_path = root / f"docs/releases/v{target_version}.md"
        existing = notes_path.read_text(encoding="utf-8-sig") if notes_path.exists() else f"# seeWallpaper {target_version}\n"
        write(root, notes_path.relative_to(root), generated_block(existing, body))
        changelog_path = root / "CHANGELOG.md"
        changelog = changelog_path.read_text(encoding="utf-8-sig")
        changelog_body = re.sub(r"(?m)^(#+) ", lambda match: match[1] + "# ", body)
        section_pattern = rf"(?m)^## {re.escape(target_version)}(?:[^\n]*)\n"
        match = re.search(section_pattern, changelog)
        if match:
            next_section = re.search(r"(?m)^## (?:\d+\.\d+\.\d+|Unreleased)\b", changelog[match.end():])
            stop = match.end() + next_section.start() if next_section else len(changelog)
            changelog = changelog[:match.end()] + generated_block(changelog[match.end():stop], changelog_body) + "\n" + changelog[stop:]
        else:
            section = f"## {target_version} - {date or datetime.date.today().isoformat()}\n\n{START}\n{changelog_body}\n{END}\n\n"
            unreleased = re.search(r"(?m)^## Unreleased[^\n]*\n", changelog)
            position = unreleased.end() if unreleased else len("# Changelog\n")
            changelog = changelog[:position].rstrip() + "\n\n" + section + changelog[position:].lstrip("\n")
        write(root, "CHANGELOG.md", changelog)
    plan = {"version": target_version, "tag": f"v{target_version}", "base_tag": base_ref,
            "release_required": release_required, "template_count": count, "added": added, "updated": updated,
            "removed": removed, "source_commit": source_commit or git(root, "rev-parse", "HEAD").strip(),
            "title": f"Release seeWallpaper {target_version}" if release_required else "Sync devops documentation"}
    write(root, ".github/release-plan.json", json.dumps(plan, indent=2))
    return plan


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-ref", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--root", default=str(Path(__file__).resolve().parent.parent))
    parser.add_argument("--bump", choices=["auto", "patch", "minor", "major"], default="auto")
    args = parser.parse_args()
    print(json.dumps(prepare(args.root, args.base_ref, args.repository, args.bump), indent=2))
