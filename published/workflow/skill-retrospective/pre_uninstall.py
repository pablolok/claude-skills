"""Pre-uninstall hook for skill-retrospective: removes its hooks from .claude/settings.local.json.

Without it, uninstalling the skill would leave settings pointing at hook scripts that no longer exist.
The state in .claude/.state/ is left alone: it belongs to the project's history, not to the skill.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wiring  # noqa: E402  pylint: disable=wrong-import-position


def remove(project: str) -> None:
    if os.path.exists(os.path.join(project, wiring.SETTINGS)):
        wiring.save(project, wiring.unwire(wiring.load(project)))
    print(f"Removed the skill-retrospective hooks from {wiring.SETTINGS}.")


if __name__ == "__main__":
    remove(sys.argv[1] if len(sys.argv) > 1 else os.getcwd())
