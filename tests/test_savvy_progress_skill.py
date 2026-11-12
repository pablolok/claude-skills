"""Tests for the savvy-progress mod: a plugin with no skill, published as its own manifest and hooks module, with the
tools and the command its users rely on, and the upstream licence and attribution travelling alongside."""

from __future__ import annotations

import json
import pathlib
import shutil
import struct
import subprocess
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import INSTALL_CONFIG, REPO  # noqa: E402  pylint: disable=wrong-import-position

MOD = "savvy-progress"
SOURCE = REPO / "skills" / MOD
PUBLISHED = REPO / "published" / "workflow" / MOD
MARKETPLACE = REPO / ".claude-plugin" / "marketplace.json"
MANIFEST = pathlib.Path(".claude-plugin") / "plugin.json"
SHIPPED = (MANIFEST.as_posix(), "hooks/hooks.json", "hooks/register.tsx", "hooks/register.test.ts", "hooks/sprite.ts",
           "hooks/themes.ts", "hooks/wardrobe.ts", "hooks/dress-spring.ts", "hooks/dress-summer.ts",
           "hooks/dress-autumn.ts", "hooks/dress-winter.ts", "types/index.d.ts",
           "plugin-entry.json",
           "metadata.json", "README.md", "LICENSE")
#: The mod's icon, where `claude plugin validate` looks for it: a square PNG, 512 to 2048 px a side, under 2 MB.
ICON = pathlib.Path(".claude-plugin") / "icon.png"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
ICON_SIDES = range(512, 2049)
ICON_MAX_BYTES = 2 * 1024 * 1024
#: What sessions and the savvy-flow skill call: the two tools (mcp__savvy-progress__<name>) and the commands.
REGISTERED = ("name: 'progress'", "name: 'step'", "name: 'agents-info'", "'mcp__savvy-progress__progress'",
              "'mcp__savvy-progress__step'", "on('command.run', { command: 'agents-info' }", "name: 'savvy-theme'",
              "on('command.run', { command: 'savvy-theme' }")
#: What a planned task may declare beside its tier, as the savvy-flow skill tells the orchestrator to: the effort and
#: the model its Agent call passes (the values that tool takes), and an agent of no tier by its type.
DECLARED = ("const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']",
            "const MODELS: readonly string[] = ['fable', 'opus', 'sonnet', 'haiku']", "enum: [...EFFORTS]",
            "enum: [...MODELS]", "...Object.keys(CODEX_WEARS), 'other']", "agent: { type: 'string'")
#: What a worker may add to its closing count, as its definition tells it to: the planned steps it left undone.
SKIPPED = ("skipped: {", "stepSkipped", "skipped: 'skipped'")
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

    def test_the_icon_is_published_as_a_square_png_of_a_size_the_validator_takes(self) -> None:
        icon = (SOURCE / ICON).read_bytes()
        self.assertTrue((PUBLISHED / ICON).is_file(), "publish the mod: the icon is missing")
        self.assertEqual((PUBLISHED / ICON).read_bytes(), icon, "publish the mod")
        self.assertEqual(icon[:8], PNG_SIGNATURE)
        self.assertEqual(icon[12:16], b"IHDR")
        width, height = struct.unpack(">II", icon[16:24])
        self.assertEqual(width, height, "a square icon")
        self.assertIn(width, ICON_SIDES)
        self.assertLess(len(icon), ICON_MAX_BYTES)

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
        self.assertEqual((language["default"], language["options"]), ("auto", ["auto", "en", "ru", "it"]))
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

    def test_a_planned_task_may_declare_its_effort_its_model_and_an_agent_of_no_tier(self) -> None:
        source = _read(PUBLISHED / "hooks" / "register.tsx")
        for literal in DECLARED:
            with self.subTest(literal=literal):
                self.assertIn(literal, source)
        contract = _read(PUBLISHED / "types" / "index.d.ts")
        for field in ("effort?: string", "model?: string", "agent?: string"):
            with self.subTest(field=field):
                self.assertIn(field, contract)

    def test_a_worker_s_step_count_takes_the_steps_it_skipped(self) -> None:
        source = _read(PUBLISHED / "hooks" / "register.tsx")
        for literal in SKIPPED:
            with self.subTest(literal=literal):
                self.assertIn(literal, source)
        self.assertIn("stepSkipped?: number", _read(PUBLISHED / "types" / "index.d.ts"))


class TestLicence(unittest.TestCase):
    def test_the_upstream_licence_and_attribution_travel_with_every_copy(self) -> None:
        for folder in (SOURCE, PUBLISHED):
            with self.subTest(folder=folder.relative_to(REPO).as_posix()):
                licence = _read(folder / "LICENSE")
                self.assertIn(COPYRIGHT, licence)
                self.assertIn(PERMISSION, licence)
                self.assertIn(ATTRIBUTION, " ".join(_read(folder / "README.md").split()))



@unittest.skipUnless(shutil.which("claude"), "the Claude Code CLI runs a mod's checks and tests")
class TestModRuns(unittest.TestCase):
    """The published mod validates and its own tests pass: the checks above read its text, these run it."""

    def _claude(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(["claude", "plugin", *args], cwd=PUBLISHED, capture_output=True, text=True,
                              encoding="utf-8", check=False)

    def test_the_mod_validates(self) -> None:
        result = self._claude("validate", ".")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_the_mod_tests_pass(self) -> None:
        result = self._claude("test")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertRegex(result.stdout + result.stderr, r"\b[1-9]\d* pass")
        self.assertNotRegex(result.stdout + result.stderr, r"\b[1-9]\d* fail")

    def test_nothing_claude_code_generates_is_published(self) -> None:
        self.assertFalse((PUBLISHED / ".claude-plugin" / "types").exists(), "automate_publish skips the generated types")
        self.assertFalse((PUBLISHED / "tsconfig.json").exists(), "automate_publish skips the generated tsconfig")


if __name__ == "__main__":
    unittest.main()
