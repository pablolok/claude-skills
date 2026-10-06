"""Wire the retrospective hooks into a project's Claude Code settings, and unwire them.

Shared by ``post_install.py`` and ``pre_uninstall.py``. The hooks go into ``.claude/settings.local.json``: the skill
is a managed, gitignored installation, so its wiring is local to the machine too, and the project's committed
``settings.json`` is never touched.

Both operations are idempotent: an entry is recognised by the hook script it runs, so reinstalling or updating the
skill never duplicates it, and removing it leaves every other hook in place.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Tuple

SETTINGS = os.path.join(".claude", "settings.local.json")
HOOKS_DIR = "$CLAUDE_PROJECT_DIR/.claude/skills/skill-retrospective/hooks"

#: (event, matcher or None, hook script) — the two hooks the skill needs.
HOOKS: List[Tuple[str, Any, str]] = [
    ("PostToolUse", "Skill", "log-skill-use.mjs"),
    ("Stop", None, "retrospective-hint.mjs"),
]


def command_for(script: str) -> str:
    """The command line Claude Code runs for ``script``."""
    return f'node "{HOOKS_DIR}/{script}"'


def _runs(entry_hook: Dict[str, Any], script: str) -> bool:
    return str(entry_hook.get("command", "")).rstrip('"').endswith(f"/skill-retrospective/hooks/{script}")


def wire(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Add the hooks to ``settings`` unless already there."""
    hooks = settings.setdefault("hooks", {})
    for event, matcher, script in HOOKS:
        entries = hooks.setdefault(event, [])
        if any(_runs(h, script) for e in entries for h in e.get("hooks", [])):
            continue
        target = next((e for e in entries if e.get("matcher") == matcher), None)
        if target is None:
            target = {"matcher": matcher} if matcher else {}
            target["hooks"] = []
            entries.append(target)
        target.setdefault("hooks", []).append({"type": "command", "command": command_for(script), "timeout": 10})
    return settings


def unwire(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Remove the skill's hooks from ``settings``, dropping entries and events left empty."""
    hooks = settings.get("hooks", {})
    for event, _matcher, script in HOOKS:
        kept = []
        for entry in hooks.get(event, []):
            entry["hooks"] = [h for h in entry.get("hooks", []) if not _runs(h, script)]
            if entry["hooks"]:
                kept.append(entry)
        if kept:
            hooks[event] = kept
        else:
            hooks.pop(event, None)
    if not hooks:
        settings.pop("hooks", None)
    return settings


def load(project: str) -> Dict[str, Any]:
    path = os.path.join(project, SETTINGS)
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save(project: str, settings: Dict[str, Any]) -> None:
    path = os.path.join(project, SETTINGS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(settings, handle, indent=2)
        handle.write("\n")
