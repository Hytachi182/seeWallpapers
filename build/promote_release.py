"""Prepare release metadata on devops; never create a second promotion PR."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

from release_metadata import git, prepare, version

BRANCH = "devops"
METADATA_PATHS = ("src/SeeWallpaper.App/SeeWallpaper.App.csproj", "templates", "README.md", "CHANGELOG.md",
                  "docs/releases", "docs/template-catalogue.md", ".github/release-plan.json")


def gh(*args, optional=False):
    result = subprocess.run(["gh", *args], text=True, encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode and not optional:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout if result.returncode == 0 else None


def verify(root, head="HEAD"):
    """Reject a PR merged before preparation, or changed after its preparation."""
    plan = json.loads(Path(root, ".github/release-plan.json").read_text(encoding="utf-8"))
    source = plan["source_commit"]
    if git(root, "merge-base", "--is-ancestor", source, head, optional=True) is None:
        raise ValueError("Release metadata does not belong to this PR; wait for preparation on devops")
    commits = git(root, "log", "--ancestry-path", "--no-merges", "--format=%s", f"{source}..{head}").splitlines()
    if not commits or any(not message.startswith("chore(release): prepare ") for message in commits):
        raise ValueError("devops changed after release preparation; wait for the new preparation and CI")
    return plan


def run(root, repository, bump="auto", dry_run=False, expected_source=None):
    git(root, "fetch", "origin", "main", "devops", "--tags")
    source = git(root, "rev-parse", "origin/devops").strip()
    if expected_source and source != expected_source:
        raise RuntimeError("devops changed before preparation; the newer push will prepare its own metadata")
    latest = json.loads(gh("api", f"repos/{repository}/releases/latest"))
    if latest["draft"] or latest["prerelease"]:
        raise ValueError("The release baseline must be a published stable release")
    base_tag = latest["tag_name"]
    previous = git(root, "show", "origin/main:.github/release-plan.json", optional=True)
    if previous:
        pending = json.loads(previous)
        if pending["release_required"] and version(pending["version"]) > version(base_tag.removeprefix("v")):
            raise ValueError("main is awaiting publication; rerun preparation after that release finishes")
    git(root, "checkout", "-B", BRANCH, "origin/devops")
    subject = git(root, "log", "-1", "--format=%s").strip()
    plan_path = Path(root, ".github/release-plan.json")
    if bump == "auto" and subject.startswith("chore(release): prepare ") and plan_path.exists():
        existing = json.loads(plan_path.read_text(encoding="utf-8"))
        if existing["base_tag"] == base_tag:
            print("devops already contains prepared metadata; no additional commit or PR")
            return existing
    plan = prepare(root, base_tag, repository, bump=bump, source_commit=source)
    print(json.dumps(plan, indent=2))
    if dry_run:
        print("Dry run: no branch push, PR, tag or release")
        return plan
    git(root, "add", *METADATA_PATHS)
    if git(root, "diff", "--cached", "--quiet", optional=True) is None:
        git(root, "commit", "-m", f"chore(release): prepare {plan['tag']} on devops")
    head = git(root, "rev-parse", "HEAD").strip()
    remote_source = git(root, "ls-remote", "origin", "refs/heads/devops").split()[0]
    if remote_source != source:
        raise RuntimeError("devops changed during preparation; retry with the newest source")
    git(root, "push", "origin", "HEAD:refs/heads/devops")
    # GITHUB_TOKEN commits do not start push/PR workflows. Check the new immutable head.
    gh("workflow", "run", "ci.yml", "--repo", repository, "--ref", BRANCH, "-f", f"check_ref={head}")
    return plan


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository")
    parser.add_argument("--bump", choices=["auto", "patch", "minor", "major"], default="auto")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--expected-source")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--head", default="HEAD")
    args = parser.parse_args()
    try:
        root = Path(__file__).resolve().parent.parent
        if args.verify:
            verify(root, args.head)
        else:
            if not args.repository:
                parser.error("--repository is required for preparation")
            run(root, args.repository, args.bump, args.dry_run, args.expected_source)
    except (RuntimeError, ValueError) as error:
        print(f"Release preparation failed: {error}", file=sys.stderr)
        sys.exit(1)
