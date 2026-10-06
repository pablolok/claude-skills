"""Post-installation hook for skill-retrospective: wires its two hooks into .claude/settings.local.json."""

from __future__ import annotations

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wiring  # noqa: E402  pylint: disable=wrong-import-position


def _tracked_by_git(project: str, path: str) -> bool:
    """True when ``path`` sits in a git work tree and is NOT ignored (git missing or no repo: False)."""
    try:
        inside = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], cwd=project,
                                capture_output=True, text=True, check=False)
        if inside.returncode != 0:
            return False
        ignored = subprocess.run(["git", "check-ignore", "-q", path], cwd=project, check=False)
        return ignored.returncode != 0
    except OSError:
        return False


def integrate(project: str) -> None:
    wiring.save(project, wiring.wire(wiring.load(project)))
    print(f"Wired the skill-retrospective hooks into {wiring.SETTINGS}.")
    if _tracked_by_git(project, wiring.SETTINGS):
        # The project's .gitignore is the project's: say it, do not edit it.
        print(f"Warning: {wiring.SETTINGS} is not ignored by git here; add it to .gitignore to keep the wiring local.")
    print("Restart Claude Code or start a new session so the hooks load.")


if __name__ == "__main__":
    integrate(sys.argv[1] if len(sys.argv) > 1 else os.getcwd())
