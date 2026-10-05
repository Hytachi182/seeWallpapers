"""Prepare/update the devops promotion PR without bypassing main protection."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

from release_metadata import git, prepare, read_project_version, version

BRANCH = "release/devops-to-main"


def gh(*args, optional=False):
    result = subprocess.run(["gh", *args], text=True, encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode and not optional:
        raise RuntimeError(result.stderr.strip())
    return result.stdout if result.returncode == 0 else None


def run(root, repository, bump, dry_run, manual):
    git(root, "fetch", "origin", "main", "devops", "--tags")
    source = git(root, "rev-parse", "origin/devops").strip()
    if not manual and git(root, "merge-base", "--is-ancestor", source, "origin/main", optional=True) is not None:
        print("devops has no commits to promote; nothing changed.")
        return
    latest = json.loads(gh("api", f"repos/{repository}/releases/latest"))
    if latest["draft"] or latest["prerelease"]:
        raise ValueError("The release baseline must be a published stable release")
    base_tag = latest["tag_name"]
    previous = git(root, "show", "origin/main:.github/release-plan.json", optional=True)
    if previous:
        plan = json.loads(previous)
        if plan["release_required"] and version(plan["version"]) > version(base_tag.removeprefix("v")):
            print(f"main version {plan['version']} is awaiting publication. Promotion resumes after publishing.")
            return
    prs = json.loads(gh("pr", "list", "--repo", repository, "--base", "main", "--head", BRANCH,
                        "--state", "open", "--json", "number,headRefOid"))
    if prs:
        git(root, "fetch", "origin", BRANCH)
        git(root, "checkout", "-B", BRANCH, f"origin/{BRANCH}")
        git(root, "merge", "--no-edit", "origin/main")
    else:
        # A previous closed promotion branch is never overwritten or force-pushed.
        existing = git(root, "ls-remote", "--heads", "origin", f"refs/heads/{BRANCH}")
        if existing.strip():
            git(root, "fetch", "origin", BRANCH)
            git(root, "checkout", "-B", BRANCH, f"origin/{BRANCH}")
            git(root, "merge", "--no-edit", "origin/main")
        else:
            git(root, "checkout", "-b", BRANCH, "origin/main")
    git(root, "merge", "--no-edit", "origin/devops")
    plan = prepare(root, base_tag, repository, bump=bump, source_commit=source)
    print(json.dumps(plan, indent=2))
    if dry_run:
        print("Dry run: metadata generated locally; no push, PR, tag, or release.")
        return
    git(root, "add", "src/SeeWallpaper.App/SeeWallpaper.App.csproj", "templates", "README.md", "CHANGELOG.md",
        "docs/releases", "docs/template-catalogue.md", ".github/release-plan.json")
    if git(root, "diff", "--cached", "--quiet", optional=True) is None:
        git(root, "commit", "-m", f"chore(release): prepare {plan['tag']} from devops")
    head = git(root, "rev-parse", "HEAD").strip()
    # Never promote a superseded snapshot unnoticed; the newer push will rerun this job.
    remote_source = git(root, "ls-remote", "origin", "refs/heads/devops").split()[0]
    if remote_source != source:
        raise RuntimeError("devops changed while preparing this release; retry with the newest source")
    git(root, "push", "origin", f"HEAD:refs/heads/{BRANCH}")
    body_file = Path(os.environ.get("RUNNER_TEMP", root)) / "promotion-pr.md"
    body = (f"Promotes devops snapshot `{source}` to main.\n\n"
            f"Application version: **{plan['version']}**; catalogue: **{plan['template_count']} wallpapers**.\n\n"
            "Automatically updates the application version, changed template versions, catalogue, README, changelog, "
            "and release notes. Existing authored notes and validation limitations are preserved.\n\n"
            + (f"After you merge this PR, Windows packages are built and checked before tag **{plan['tag']}** "
               "and its release are published. Review the notes and outstanding desktop acceptance before merging.\n"
               if plan["release_required"] else "Documentation-only promotion: no application tag or release is published.\n"))
    body_file.write_text(body, encoding="utf-8")
    if prs:
        gh("pr", "edit", str(prs[0]["number"]), "--repo", repository, "--title", plan["title"], "--body-file", str(body_file))
    else:
        print(gh("pr", "create", "--repo", repository, "--base", "main", "--head", BRANCH,
                 "--title", plan["title"], "--body-file", str(body_file)))
    # GITHUB_TOKEN pushes do not start CI. Explicit dispatch checks this exact head;
    # checkout uses an immutable SHA and CI keeps its existing required check name.
    gh("workflow", "run", "ci.yml", "--repo", repository, "--ref", BRANCH, "-f", f"check_ref={head}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--bump", choices=["auto", "patch", "minor", "major"], default="auto")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--manual", action="store_true")
    args = parser.parse_args()
    try:
        run(Path(__file__).resolve().parent.parent, args.repository, args.bump, args.dry_run, args.manual)
    except (RuntimeError, ValueError) as error:
        print(f"Promotion failed: {error}", file=sys.stderr)
        sys.exit(1)
