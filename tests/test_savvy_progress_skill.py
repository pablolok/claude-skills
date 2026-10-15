"""Tests for the savvy-progress mod: a plugin with no skill, published as its own manifest and hooks module, with the
tools and the command its users rely on, and the upstream licence and attribution travelling alongside."""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import INSTALL_CONFIG, REPO  # noqa: E402  pylint: disable=wrong-import-position

MOD = "savvy-progress"
SOURCE = REPO / "skills" / MOD
PUBLISHED = REPO / "published" / "workflow" / MOD
MARKETPLACE = REPO / ".claude-plugin" / "marketplace.json"
MANIFEST = pathlib.Path(".claude-plugin") / "plugin.json"
SHIPPED = (MANIFEST.as_posix(), "hooks/hooks.json", "hooks/register.tsx", "hooks/register.test.ts", "types/index.d.ts",
           "plugin-entry.json",
           "metadata.json", "README.md", "LICENSE")
#: What sessions and the savvy-flow skill call: the two tools (mcp__savvy-progress__<name>) and the command.
REGISTERED = ("name: 'progress'", "name: 'step'", "name: 'agents-info'", "'mcp__savvy-progress__progress'",
              "'mcp__savvy-progress__step'", "on('command.run', { command: 'agents-info' }")
#: The MIT licence asks for its copyright and permission notice to stay with every copy.
COPYRIGHT = "Copyright (c) 2026 johnnyvizz"
PERMISSION = "The above copyright notice and this permission notice shall be included in all"
ATTRIBUTION = "Originally by johnnyvizz (github.com/johnnyvizz/claude-kit), MIT; imported from main on 2026-10-11."


def _read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def _json(path: pathlib.Path) -> dict:
    return json.loads(_read(path))


class TestPublishedMod(unittest.TestCase):
    def test_the_published_mod_is_the_source(self) -> None:
        for rel in SHIPPED:
            with self.subTest(file=rel):
                self.assertTrue((PUBLISHED / rel).is_file(), f"publish the mod: {rel} is missing")
                self.assertEqual(_read(PUBLISHED / rel), _read(SOURCE / rel), "publish the mod")

    def test_it_is_registered_as_a_plugin_with_no_skill(self) -> None:
        self.assertEqual(_json(INSTALL_CONFIG)["skills"][MOD], {"category": "workflow", "skill": False})
        self.assertFalse((SOURCE / "SKILL.md").exists())
        self.assertFalse((PUBLISHED / "SKILL.md").exists())

    def test_the_marketplace_lets_claude_code_read_its_own_manifest(self) -> None:
        # Under the default strict: false Claude Code refuses a mod ("conflicting manifests").
        self.assertEqual(_json(PUBLISHED / "plugin-entry.json"), {"strict": True})
        [entry] = [plugin for plugin in _json(MARKETPLACE)["plugins"] if plugin["name"] == MOD]
        self.assertIs(entry["strict"], True)
        self.assertNotIn("skills", entry)
        self.assertEqual(entry["source"], "./published/workflow/" + MOD)


class TestManifest(unittest.TestCase):
    def test_the_manifest_names_the_mod_and_agrees_with_the_metadata(self) -> None:
        manifest, metadata = _json(PUBLISHED / MANIFEST), _json(PUBLISHED / "metadata.json")
        self.assertEqual((manifest["name"], metadata["name"]), (MOD, MOD))
        self.assertEqual(manifest["version"], metadata["version"], "Claude Code reads the manifest's version first")
        self.assertEqual(manifest["description"], metadata["description"])

    def test_the_language_option_and_the_types_are_kept(self) -> None:
        manifest = _json(PUBLISHED / MANIFEST)
        language = manifest["userConfig"]["language"]
        self.assertEqual((language["default"], language["options"]), ("auto", ["auto", "en", "ru"]))
        self.assertTrue((PUBLISHED / manifest["types"]).is_file(), manifest["types"])

    def test_hooks_json_names_the_module_the_folder_ships(self) -> None:
        modules = _json(PUBLISHED / "hooks" / "hooks.json")["modules"]
        self.assertEqual(modules, ["./register.tsx"])
        self.assertTrue((PUBLISHED / "hooks" / "register.tsx").is_file())


class TestModule(unittest.TestCase):
    def test_the_module_keeps_its_tools_and_command(self) -> None:
        source = _read(PUBLISHED / "hooks" / "register.tsx")
        for literal in REGISTERED:
            self.assertIn(literal, source)


class TestLicence(unittest.TestCase):
    def test_the_upstream_licence_and_attribution_travel_with_every_copy(self) -> None:
        for folder in (SOURCE, PUBLISHED):
            with self.subTest(folder=folder.relative_to(REPO).as_posix()):
                licence = _read(folder / "LICENSE")
                self.assertIn(COPYRIGHT, licence)
                self.assertIn(PERMISSION, licence)
                self.assertIn(ATTRIBUTION, " ".join(_read(folder / "README.md").split()))


if __name__ == "__main__":
    unittest.main()
