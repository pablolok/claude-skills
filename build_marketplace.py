"""Build the Claude Code plugin marketplace (.claude-plugin/marketplace.json) from the published skills.

Every published skill becomes one plugin, so a project installs any of them with Claude Code alone — no clone, no
Python, in a cloud session too:

    claude plugin marketplace add pablolok/claude-skills
    claude plugin install <skill>@pablolok-skills

The marketplace is derived, never edited by hand: its list is install.config.json (the categories) and each
published skill's metadata.json (version, description). A skill that needs more than its own folder as a plugin
(hooks, slash commands) declares it in its own ``plugin-entry.json``; a skill that makes no sense as a plugin says
``"plugin": false`` in install.config.json. This file names no skill.

    python build_marketplace.py          # write the marketplace
    python build_marketplace.py --check  # exit 1 when the committed marketplace differs from the published skills
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import typing

REPO = pathlib.Path(__file__).resolve().parent
INSTALL_CONFIG = "install.config.json"
PUBLISHED = "published"
MARKETPLACE = pathlib.Path(".claude-plugin") / "marketplace.json"
PLUGIN_ENTRY = "plugin-entry.json"

MARKETPLACE_NAME = "pablolok-skills"
OWNER = {"name": "pablolok"}
DESCRIPTION = "pablolok's Claude Code skills — one plugin per skill, the same skills skill-manager installs."

#: The plugin-entry fields a skill may declare for itself; their paths are relative to the skill's folder.
ENTRY_FIELDS = ("hooks", "commands", "agents")


class MarketplaceError(Exception):
    """The published skills cannot be turned into a marketplace (a missing folder, a bad declaration)."""


def _read_json(path: pathlib.Path) -> typing.Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise MarketplaceError(f"{path}: {exc}") from exc


def plugin_entry(repo: pathlib.Path, name: str, category: str) -> typing.Dict[str, typing.Any]:
    """The marketplace entry of one published skill: the skill's folder is the plugin, its root is the skill."""
    folder = repo / PUBLISHED / category / name
    if not (folder / "SKILL.md").is_file():
        raise MarketplaceError(f"{name}: no published skill at {folder.relative_to(repo).as_posix()}")
    metadata = _read_json(folder / "metadata.json")
    entry: typing.Dict[str, typing.Any] = {
        "name": name,
        "source": f"./{PUBLISHED}/{category}/{name}",
        "description": metadata["description"],
        "version": metadata["version"],
        "category": category,
        "strict": False,
        "skills": ["./"],
    }
    declared_path = folder / PLUGIN_ENTRY
    if declared_path.is_file():
        declared = _read_json(declared_path)
        unknown = sorted(set(declared) - set(ENTRY_FIELDS))
        if unknown:
            raise MarketplaceError(f"{name}/{PLUGIN_ENTRY}: unknown field(s) {unknown} (allowed: {list(ENTRY_FIELDS)})")
        entry.update(declared)
    return entry


def build(repo: pathlib.Path = REPO) -> typing.Dict[str, typing.Any]:
    """The whole marketplace, plugins in name order so the file only changes when a skill does."""
    skills = _read_json(repo / INSTALL_CONFIG).get("skills", {})
    plugins = [
        plugin_entry(repo, name, config["category"])
        for name, config in sorted(skills.items())
        if config.get("plugin", True)
    ]
    return {
        "name": MARKETPLACE_NAME,
        "owner": OWNER,
        "metadata": {"description": DESCRIPTION},
        "plugins": plugins,
    }


def render(marketplace: typing.Dict[str, typing.Any]) -> str:
    """The file's text: stable formatting, LF, final newline."""
    return json.dumps(marketplace, indent=2, ensure_ascii=False) + "\n"


def main(argv: typing.Optional[typing.Sequence[str]] = None) -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="fail when the committed marketplace is out of date")
    args = parser.parse_args(argv)
    try:
        text = render(build(REPO))
    except MarketplaceError as exc:
        print(f"marketplace: {exc}", file=sys.stderr)
        return 2
    target = REPO / MARKETPLACE
    current = target.read_text(encoding="utf-8") if target.exists() else None
    if args.check:
        if current != text:
            print(f"{MARKETPLACE.as_posix()} is out of date: run `python build_marketplace.py`", file=sys.stderr)
            return 1
        print(f"{MARKETPLACE.as_posix()} matches the published skills")
        return 0
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print(f"wrote {MARKETPLACE.as_posix()} ({len(json.loads(text)['plugins'])} plugins)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
