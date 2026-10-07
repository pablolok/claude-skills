"""Wire the retrospective hooks into a project's Claude Code settings, and unwire them.

Shared by ``post_install.py`` and ``pre_uninstall.py``. The hooks go into ``.claude/settings.local.json``: the skill
is a managed, gitignored installation, so its wiring is local to the machine too, and the project's committed
``settings.json`` is never touched.

Both operations are idempotent: an entry is recognised by the hook script it runs, so reinstalling or updating the
skill never duplicates it, and removing it leaves every other hook in place.

The hooks themselves are listed once, in ``plugin-entry.json`` (what the Claude Code plugin installs): this module
reads their events, matchers and scripts from there, so the two ways of installing the skill cannot drift apart.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Tuple

SETTINGS = os.path.join(".claude", "settings.local.json")
HOOKS_DIR = "$CLAUDE_PROJECT_DIR/.claude/skills/skill-retrospective/hooks"
PLUGIN_ENTRY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plugin-entry.json")
_SCRIPT = re.compile(r"/hooks/([\w.-]+\.mjs)")


def _declared_hooks(path: str = PLUGIN_ENTRY) -> List[Tuple[str, Any, str]]:
    """(event, matcher or None, hook script) for every hook the plugin entry declares."""
    with open(path, "r", encoding="utf-8") as handle:
        declared = json.load(handle)["hooks"]
    found = []
    for event, entries in declared.items():
        for entry in entries:
            for hook in entry["hooks"]:
                script = _SCRIPT.search(hook["command"])
                if not script:
                    raise ValueError(f"{path}: {event} hook runs no hooks/*.mjs script: {hook['command']}")
                found.append((event, entry.get("matcher"), script.group(1)))
    return found


#: (event, matcher or None, hook script) — the hooks the skill needs.
HOOKS: List[Tuple[str, Any, str]] = _declared_hooks()


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
