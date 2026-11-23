"""Build the Claude Code plugin marketplace (.claude-plugin/marketplace.json) from the published skills.

Each published single skill or bundle becomes one plugin, installed with Claude Code alone — no clone, no
Python, in a cloud session too:

    claude plugin marketplace add pablolok/claude-skills
    claude plugin install <skill>@pablolok-skills

The marketplace is derived, never edited by hand: its list is install.config.json (the categories) and each
published skill's metadata.json (version, description). A skill that needs more than its own folder as a plugin
(hooks, slash commands) declares it in its own ``plugin-entry.json``; a skill that makes no sense as a plugin says
``"plugin": false`` in install.config.json; a mod that carries no skill (its own manifest and hooks module alone) says
``"skill": false`` there. This file names no skill.
Bundles declare ``"kind": "bundle"`` in both config and metadata, and expose their nested ``skills/<skill>/``
directories. Unpublished empty skeletons are skipped; populated or already published bundles must validate.

    python build_marketplace.py          # write the marketplace
    python build_marketplace.py --check  # exit 1 when the committed marketplace differs from the published skills

``--check`` also fails when a published plugin's Antigravity manifest (or the Antigravity copy of a plugin with Claude
agents) is missing or stale: ``automate_publish.py`` writes them, see ``antigravity_manifest.py``.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import typing

import antigravity_manifest

REPO = pathlib.Path(__file__).resolve().parent
INSTALL_CONFIG = "install.config.json"
PUBLISHED = "published"
MARKETPLACE = pathlib.Path(".claude-plugin") / "marketplace.json"
PLUGIN_ENTRY = "plugin-entry.json"
#: A mod's own manifest, inside its folder.
MOD_MANIFEST = pathlib.Path(".claude-plugin") / "plugin.json"

MARKETPLACE_NAME = "pablolok-skills"
OWNER = {"name": "pablolok"}
DESCRIPTION = "pablolok's Claude Code skills — one plugin per skill."

#: The longest plugin description claude.ai accepts: a longer one is synced without it, with a warning.
MAX_DESCRIPTION = 500

#: The plugin-entry fields a skill may declare for itself; their paths are relative to the skill's folder.
#: `strict: true` is for a skill that ships its own `.claude-plugin/plugin.json` — a mod, whose `hooks/hooks.json` names
#: its hooks module: under `strict: false` Claude Code refuses the plugin ("conflicting manifests").
ENTRY_FIELDS = ("hooks", "commands", "agents", "strict")


class MarketplaceError(Exception):
    """The published skills cannot be turned into a marketplace (a missing folder, a bad declaration)."""


def _read_json(path: pathlib.Path) -> typing.Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise MarketplaceError(f"{path}: {exc}") from exc


def skill_frontmatter(path: pathlib.Path) -> typing.Dict[str, str]:
    """Validate the repository's flat, one-line YAML frontmatter without a YAML dependency.

    Plain strings, YAML single quotes and JSON double quotes are supported. Collections, block scalars,
    anchors and nested mappings are deliberately rejected; optional scalar fields may accompany name/description.
    """
    def fail(reason: str) -> typing.NoReturn:
        raise MarketplaceError(f"{path.as_posix()}: invalid frontmatter: {reason}")

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as exc:
        fail(str(exc))
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        fail("expected opening and closing --- fences")
    fields = {}
    for line in lines[1:lines.index("---", 1)]:
        if not line.strip() or line.startswith("#"):
            continue
        match = re.fullmatch(r"([A-Za-z][A-Za-z0-9_-]*):(?:[ \t]+(.*))?", line)
        if match is None:
            fail("use one key: value per line, without nesting")
        key, value = match.group(1), (match.group(2) or "").strip()
        if key in fields:
            fail(f"duplicate {key}")
        quoted = value.startswith(("'", '"'))
        if value.startswith('"'):
            try:
                decoded, end = json.JSONDecoder().raw_decode(value)
            except ValueError:
                fail(f"{key} has invalid double quotes (use JSON string escaping)")
            tail = value[end:].strip()
            if tail and not tail.startswith("#"):
                fail(f"unexpected text after {key}")
            value = decoded
        elif value.startswith("'"):
            single = re.fullmatch(r"'((?:[^']|'')*)'\s*(?:#.*)?", value)
            if single is None:
                fail(f"{key} has invalid single quotes")
            value = single.group(1).replace("''", "'")
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].rstrip()
            if (value.startswith(tuple("[]{}!&*|>%@`#")) or re.search(r":(?:\s|$)", value)
                    or re.match(r"[-?](?:\s|$)", value)):
                fail(f"{key} must be a one-line scalar; quote punctuation where needed")
        if key in ("name", "description"):
            if not value.strip() or any(ord(char) < 32 for char in value):
                fail(f"{key} must be a nonempty one-line string")
            if not quoted and (value.lower() in ("null", "~", "true", "false", "yes", "no", "on", "off",
                                                 ".nan", ".inf", "+.inf", "-.inf")
                               or re.fullmatch(r"[-+]?\d[\d.eExXa-fA-F_+-]*", value)):
                fail(f"{key} must be a string, not a YAML boolean, null or number")
        fields[key] = value
    if fields.get("name") != path.parent.name or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", fields.get("name", "")):
        fail("name must match the skill directory (lowercase letters, digits and hyphens)")
    description = fields.get("description", "")
    if not description or len(description) > MAX_DESCRIPTION:
        fail(f"description must contain 1 to {MAX_DESCRIPTION} characters")
    return fields


def bundle_skills(folder: pathlib.Path, allow_empty: bool = False) -> typing.List[pathlib.Path]:
    """Validate a bundle and return its skill directories in stable order, before publishing or listing it."""
    metadata = _read_json(folder / "metadata.json")
    if metadata.get("kind") != "bundle":
        raise MarketplaceError(f"{folder.name}: metadata.json must declare kind: bundle, matching install.config.json")
    if metadata.get("name") != folder.name:
        raise MarketplaceError(f"{folder.name}: metadata name must match the bundle directory")
    description = metadata.get("description")
    if not isinstance(description, str) or not description.strip() or len(description) > MAX_DESCRIPTION:
        raise MarketplaceError(f"{folder.name}: bundle description must contain 1 to {MAX_DESCRIPTION} characters")
    if not isinstance(metadata.get("version"), str) or not re.fullmatch(r"\d+\.\d+\.\d+", metadata["version"]):
        raise MarketplaceError(f"{folder.name}: bundle version must be major.minor.patch")
    skills_folder = folder / "skills"
    skills = sorted(path for path in skills_folder.iterdir() if path.is_dir()) if skills_folder.is_dir() else []
    for skill in skills:
        if not (skill / "SKILL.md").is_file():
            raise MarketplaceError(f"{skill.as_posix()}: bundled skill is missing SKILL.md")
        skill_frontmatter(skill / "SKILL.md")
    if not skills and not allow_empty:
        raise MarketplaceError(f"{folder.name}: bundle needs at least one skill in skills/<skill>/SKILL.md before publishing")
    return skills


def plugin_entry(
    repo: pathlib.Path, name: str, category: str, has_skill: bool = True, bundle: bool = False
) -> typing.Dict[str, typing.Any]:
    """One plugin entry: an individual skill at the root, or several skills nested inside a bundle.

    A mod with no skill (``has_skill`` false) is its folder alone: its own manifest, no ``skills``, and ``strict``
    declared so Claude Code reads that manifest.
    """
    folder = repo / PUBLISHED / category / name
    where = folder.relative_to(repo).as_posix()
    bundled = bundle_skills(folder) if bundle else []
    if has_skill and not bundle and not (folder / "SKILL.md").is_file():
        raise MarketplaceError(f"{name}: no published skill at {where}")
    if not has_skill and not (folder / MOD_MANIFEST).is_file():
        raise MarketplaceError(f"{name}: a plugin with no skill is a mod, and {where} has no {MOD_MANIFEST.as_posix()}")
    metadata = _read_json(folder / "metadata.json")
    if (metadata.get("kind") == "bundle") != bundle:
        raise MarketplaceError(f"{name}: kind must agree in install.config.json and metadata.json")
    if len(metadata["description"]) > MAX_DESCRIPTION:
        raise MarketplaceError(
            f"{name}: description is {len(metadata['description'])} characters, the limit is {MAX_DESCRIPTION}"
        )
    entry: typing.Dict[str, typing.Any] = {
        "name": name,
        "source": f"./{PUBLISHED}/{category}/{name}",
        "description": metadata["description"],
        "version": metadata["version"],
        "category": category,
        "strict": False,
    }
    if bundle:
        if not has_skill:
            raise MarketplaceError(f"{name}: a bundle cannot declare skill: false")
        entry["skills"] = ["./" + skill.relative_to(folder).as_posix() for skill in bundled]
    elif has_skill:
        entry["skills"] = ["./"]
    declared_path = folder / PLUGIN_ENTRY
    if declared_path.is_file():
        declared = _read_json(declared_path)
        unknown = sorted(set(declared) - set(ENTRY_FIELDS))
        if unknown:
            raise MarketplaceError(f"{name}/{PLUGIN_ENTRY}: unknown field(s) {unknown} (allowed: {list(ENTRY_FIELDS)})")
        if "strict" in declared and not isinstance(declared["strict"], bool):
            raise MarketplaceError(f"{name}/{PLUGIN_ENTRY}: \"strict\" is true or false, not {declared['strict']!r}")
        entry.update(declared)
    if not has_skill and entry["strict"] is not True:
        raise MarketplaceError(f"{name}: a mod with no skill declares {{\"strict\": true}} in its {PLUGIN_ENTRY}")
    return entry


def build(repo: pathlib.Path = REPO) -> typing.Dict[str, typing.Any]:
    """The whole marketplace, plugins in name order so the file only changes when a skill does."""
    skills = _read_json(repo / INSTALL_CONFIG).get("skills", {})
    plugins = []
    for name, config in sorted(skills.items()):
        if not config.get("plugin", True):
            continue
        bundle = config.get("kind") == "bundle"
        if bundle and not (repo / PUBLISHED / config["category"] / name).exists():
            if not bundle_skills(repo / "skills" / name, allow_empty=True):
                print(f"Skipping {name}: bundle needs at least one skill before publishing", file=sys.stderr)
                continue
            raise MarketplaceError(f"{name}: no published bundle at {PUBLISHED}/{config['category']}/{name}")
        plugins.append(plugin_entry(repo, name, config["category"], config.get("skill", True), bundle))
    return {
        "name": MARKETPLACE_NAME,
        "owner": OWNER,
        "metadata": {"description": DESCRIPTION},
        "plugins": plugins,
    }


def antigravity_problems(repo: pathlib.Path = REPO) -> typing.List[str]:
    """What keeps the published plugins from loading in Antigravity as the publish leaves them; empty when current."""
    skills = _read_json(repo / INSTALL_CONFIG).get("skills", {})
    tree = repo / antigravity_manifest.TREE
    found: typing.List[str] = []
    copies = []
    for name, config in sorted(skills.items()):
        folder = repo / PUBLISHED / config["category"] / name
        if not config.get("plugin", True) or not folder.is_dir():
            continue
        found += antigravity_manifest.problems(folder, config["category"], tree, repo)
        if antigravity_manifest.has_claude_agents(folder):
            copies.append(antigravity_manifest.copy_folder(folder, config["category"], tree))
    return found + antigravity_manifest.orphans(tree, copies, repo)


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
        stale = current != text
        if stale:
            print(f"{MARKETPLACE.as_posix()} is out of date: run `python build_marketplace.py`", file=sys.stderr)
        try:
            antigravity = antigravity_problems(REPO)
        except (MarketplaceError, OSError, ValueError, KeyError) as exc:
            antigravity = [str(exc)]
        for problem in antigravity:
            print(f"antigravity: {problem}: publish the plugin with `python automate_publish.py`", file=sys.stderr)
        if stale or antigravity:
            return 1
        print(f"{MARKETPLACE.as_posix()} and the Antigravity manifests match the published skills")
        return 0
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print(f"wrote {MARKETPLACE.as_posix()} ({len(json.loads(text)['plugins'])} plugins)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
