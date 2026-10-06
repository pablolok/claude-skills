"""Post-install hook for skill-manager.

Adds Claude Code project-local skill-manager integration for installed skills:
- a SessionStart hook (in .claude/settings.json) that reports available updates
- `/skill-manager:*` slash commands for list/install/update/uninstall
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from typing import Any, Dict, List


HOOK_COMMAND = "python3 .claude/skills/skill-manager/scripts/session_start_hook.py"
COMMAND_TEMPLATES = {
    "list.md": '''---
description: List installed skills, available published skills, and pending updates.
---

Use the command output below as the source of truth. Summarize:
- installed skills
- available published skills
- any updates available right now

!`python3 .claude/skills/skill-manager/scripts/list_skills.py`
''',
    "update.md": '''---
description: Update installed Claude skills from the configured skills repository.
---

A skill update was requested for the current project.

Use the command output below as the source of truth. Report the result clearly:
- if updates were applied, list the updated skills and tell the user to restart Claude Code (or start a new session) to load them
- if no updates were available, say that explicitly
- if the updater failed, surface the failure reason

!`python3 .claude/skills/skill-manager/scripts/update_skills.py`
''',
    "install.md": '''---
description: Install one or more published skills into the current project.
---

A skill installation was requested. The raw arguments are: $ARGUMENTS

Use the command output below as the source of truth. If the install succeeds, summarize what was installed and tell the user to restart Claude Code (or start a new session) so the new skills are discovered.
If the user did not provide any skill names, explain the available skills from the command output and tell them to rerun `/skill-manager:install <category/skill> [more-skills]`.

!`python3 .claude/skills/skill-manager/scripts/install_skills.py $ARGUMENTS`
''',
    "uninstall.md": '''---
description: Uninstall one or more skills from the current project.
---

A skill uninstall was requested. The raw arguments are: $ARGUMENTS

Use the command output below as the source of truth. If the uninstall succeeds, summarize what was removed.
If the user did not provide any skill names, explain the installed skills from the command output and tell them to rerun `/skill-manager:uninstall <skill-name> [more-skills]`.

!`python3 .claude/skills/skill-manager/scripts/uninstall_skills.py $ARGUMENTS`
''',
}
GITIGNORE_MARKER_START = "# >>> skill-manager managed workspace files >>>"
GITIGNORE_MARKER_END = "# <<< skill-manager managed workspace files <<<"
MANAGED_SKILL_MANIFEST = ".claude/skill-manager-manifest.json"
GITIGNORE_ENTRIES = [
    ".claude/commands/skill-manager/",
    ".claude/settings.json",
    MANAGED_SKILL_MANIFEST,
]


def _load_json(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {}

    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: str, payload: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def _ensure_session_start_hook(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure the Claude Code SessionStart update-check hook exists in settings."""
    hooks = settings.setdefault("hooks", {})
    session_start = hooks.setdefault("SessionStart", [])
    command_entry = {"type": "command", "command": HOOK_COMMAND}

    for entry in session_start:
        if entry.get("matcher") != "startup":
            continue
        nested_hooks = entry.setdefault("hooks", [])
        for nested in nested_hooks:
            if str(nested.get("command", "")).endswith("session_start_hook.py"):
                nested["type"] = "command"
                nested["command"] = HOOK_COMMAND
                return settings
        nested_hooks.append(dict(command_entry))
        return settings

    session_start.append({"matcher": "startup", "hooks": [dict(command_entry)]})
    return settings


def _write_custom_commands(target_project_path: str) -> None:
    command_dir = os.path.join(
        target_project_path,
        ".claude",
        "commands",
        "skill-manager",
    )
    os.makedirs(command_dir, exist_ok=True)
    for filename, content in COMMAND_TEMPLATES.items():
        command_path = os.path.join(command_dir, filename)
        with open(command_path, "w", encoding="utf-8") as handle:
            handle.write(content)


def _write_runtime_config(target_project_path: str, source_repo_root: str) -> None:
    config_path = os.path.join(
        target_project_path,
        ".claude",
        "skills",
        "skill-manager",
        "runtime_config.json",
    )
    payload = {
        "source_repo_root": source_repo_root,
        "published_dir": os.path.join(source_repo_root, "published"),
    }
    _write_json(config_path, payload)


def _ensure_gitignore_entries(target_project_path: str) -> None:
    """Write the managed block, keeping the lines it already has and the file's line endings.

    The .gitignore is committed and shared by every clone; the manifest only knows THIS machine's installs, so it
    adds lines and never removes one (uninstalling a skill is what removes its line).
    """
    gitignore_path = os.path.join(target_project_path, ".gitignore")
    manifest = _normalize_managed_skill_manifest(
        target_project_path,
        _load_managed_skill_manifest(target_project_path),
    )
    already_listed = set(_read_managed_gitignore_entries(target_project_path)["claude"])
    names = already_listed | set(manifest.get("claude", []))
    skill_entries = _build_managed_skill_ignore_entries({"claude": sorted(names)})
    managed_lines = [
        GITIGNORE_MARKER_START,
        "# Ignore local Claude workspace commands generated by skill-manager",
        GITIGNORE_ENTRIES[0],
        "# Ignore local Claude workspace settings written by skill-manager",
        GITIGNORE_ENTRIES[1],
        "# Ignore the local skill-manager installation manifest",
        GITIGNORE_ENTRIES[2],
    ]
    if skill_entries:
        managed_lines.extend(
            [
                "# Ignore skill directories installed and managed by skill-manager",
                *skill_entries,
            ]
        )
    managed_lines.append(GITIGNORE_MARKER_END)

    if os.path.exists(gitignore_path):
        # newline="" reads the bytes' line endings as they are: a CRLF file must stay CRLF.
        with open(gitignore_path, "r", encoding="utf-8", newline="") as handle:
            content = handle.read()
    else:
        content = ""
    eol = "\r\n" if "\r\n" in content else "\n"
    managed_block = eol.join(managed_lines)

    if GITIGNORE_MARKER_START in content and GITIGNORE_MARKER_END in content:
        start = content.index(GITIGNORE_MARKER_START)
        end = content.index(GITIGNORE_MARKER_END) + len(GITIGNORE_MARKER_END)
        before = content[:start].rstrip("\r\n")
        after = content[end:].lstrip("\r\n")
        sections = [section for section in (before, managed_block, after) if section]
        updated = (eol + eol).join(sections) + eol
    else:
        updated = content.rstrip()
        if updated:
            updated += eol + eol
        updated += managed_block + eol

    if updated != content:
        with open(gitignore_path, "w", encoding="utf-8", newline="") as handle:
            handle.write(updated)


def _managed_skill_manifest_path(target_project_path: str) -> str:
    return os.path.join(target_project_path, ".claude", "skill-manager-manifest.json")


def _load_managed_skill_manifest(target_project_path: str) -> Dict[str, Any]:
    manifest_path = _managed_skill_manifest_path(target_project_path)
    legacy_path = os.path.join(
        target_project_path, ".gemini", "skill-manager-manifest.json"
    )
    source_path = manifest_path if os.path.exists(manifest_path) else legacy_path
    if not os.path.exists(source_path):
        return _discover_managed_skills(target_project_path)

    with open(source_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    merged: set[str] = set()
    for key in ("claude", "agents", "gemini", "codex", "copilot"):
        for value in payload.get(key, []):
            if str(value).strip():
                merged.add(str(value))
    return {"claude": sorted(merged)}


def _read_managed_gitignore_entries(target_project_path: str) -> Dict[str, Any]:
    gitignore_path = os.path.join(target_project_path, ".gitignore")
    manifest: Dict[str, Any] = {"claude": []}
    if not os.path.exists(gitignore_path):
        return manifest

    with open(gitignore_path, "r", encoding="utf-8") as handle:
        content = handle.read()

    if GITIGNORE_MARKER_START not in content or GITIGNORE_MARKER_END not in content:
        return manifest

    start = content.index(GITIGNORE_MARKER_START) + len(GITIGNORE_MARKER_START)
    end = content.index(GITIGNORE_MARKER_END)
    block = content[start:end]
    prefixes = (
        ".claude/skills/",
        ".agents/skills/",
        ".gemini/skills/",
        ".codex/skills/",
    )

    names: set[str] = set()
    for raw_line in block.splitlines():
        line = raw_line.strip()
        for prefix in prefixes:
            if line.startswith(prefix) and line.endswith("/"):
                skill_name = line[len(prefix):-1].strip()
                if skill_name:
                    names.add(skill_name)
                break

    manifest["claude"] = sorted(names)
    return manifest


def _discover_managed_skills(target_project_path: str) -> Dict[str, Any]:
    return _read_managed_gitignore_entries(target_project_path)


def _write_managed_skill_manifest(target_project_path: str, manifest: Dict[str, Any]) -> None:
    manifest_path = _managed_skill_manifest_path(target_project_path)
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump({"claude": sorted(set(manifest.get("claude", [])))}, handle, indent=2)
        handle.write("\n")


def _is_link_or_junction(path: str) -> bool:
    if os.path.islink(path):
        return True

    if sys.platform == "win32":
        try:
            import ctypes

            attrs = ctypes.windll.kernel32.GetFileAttributesW(path)
            return attrs != -1 and bool(attrs & 0x400)
        except Exception:
            return False
    return False


def _normalize_managed_skill_manifest(target_project_path: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
    claude_dir = os.path.join(target_project_path, ".claude", "skills")
    kept: List[str] = []
    for skill_name in manifest.get("claude", []):
        if os.path.isdir(os.path.join(claude_dir, skill_name)):
            kept.append(skill_name)

    normalized = {"claude": sorted(set(kept))}
    if normalized["claude"] != sorted(set(manifest.get("claude", []))):
        _write_managed_skill_manifest(target_project_path, normalized)
    return normalized


def _register_managed_skill(target_project_path: str, skill_name: str) -> None:
    manifest = _normalize_managed_skill_manifest(
        target_project_path,
        _load_managed_skill_manifest(target_project_path),
    )
    current = set(manifest.get("claude", []))
    current.add(skill_name)
    manifest["claude"] = sorted(current)
    _write_managed_skill_manifest(target_project_path, manifest)


def _build_managed_skill_ignore_entries(manifest: Dict[str, Any]) -> List[str]:
    return [f".claude/skills/{skill_name}/" for skill_name in manifest.get("claude", [])]


def integrate(target_project_path: str) -> None:
    target_project_path = os.path.abspath(target_project_path)
    source_repo_root = os.environ.get("CLAUDE_SKILLS_REPO_ROOT")
    if not source_repo_root:
        published_dir = os.environ.get("CLAUDE_SKILLS_PUBLISHED_DIR")
        if published_dir:
            source_repo_root = os.path.dirname(os.path.abspath(published_dir))
        else:
            source_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    source_repo_root = os.path.abspath(source_repo_root)

    settings_path = os.path.join(target_project_path, ".claude", "settings.json")
    settings = _load_json(settings_path)
    updated_settings = _ensure_session_start_hook(settings)
    _write_json(settings_path, updated_settings)

    _write_custom_commands(target_project_path)
    _write_runtime_config(target_project_path, source_repo_root)
    _register_managed_skill(target_project_path, "skill-manager")
    _ensure_gitignore_entries(target_project_path)

    print("Configured the Claude Code SessionStart update hook and /skill-manager:* commands.")
    print("Updated .gitignore to exclude local Claude skill-manager workspace files.")
    print("Restart Claude Code or start a new session so the hook and commands load.")
    print("You can verify the setup with /skill-manager:list.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 post_install.py <target_project_path>")
        sys.exit(1)

    integrate(sys.argv[1])
