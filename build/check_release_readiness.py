"""Gate expensive PR validation until devops has prepared release metadata."""
import os
from pathlib import Path
import sys

from promote_release import verify


def readiness(root, check_release, head, expected_sha=None, actual_sha=None):
    if expected_sha and expected_sha != actual_sha:
        raise ValueError("devops changed before dispatch; the newest preparation will validate its own commit")
    if check_release:
        try:
            verify(root, head)
        except (ValueError, FileNotFoundError) as error:
            # A source PR may open before the metadata bot finishes its push.
            # Do not run Windows tests or produce a passing required check yet.
            return False, str(error)
    return True, "Ready to build and test"


def main():
    ready, message = readiness(Path.cwd(), os.environ.get("CHECK_RELEASE") == "true",
                               os.environ["CHECK_REF"], os.environ.get("EXPECTED_SHA"), os.environ["GITHUB_SHA"])
    if not ready and os.environ["GITHUB_EVENT_NAME"] == "workflow_dispatch":
        raise ValueError(message)
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write("ready=" + str(ready).lower() + "\n")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
        summary.write("## " + ("Ready for validation" if ready else "Version preparation in progress") + "\n\n")
        summary.write(message + "\n\n")
        if not ready:
            summary.write("Wait for **1 - Prepare version**. It commits the metadata to devops and starts validation automatically. The required build-and-test check is not issued for this unprepared commit.\n")
    print(message)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError) as error:
        print(f"Readiness check failed: {error}", file=sys.stderr)
        sys.exit(1)
