"""Tests for the skill-retrospective skill: its hook wiring, a real install/uninstall, and its Node hooks."""

from __future__ import annotations

import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
SOURCE = REPO / "skills" / "skill-retrospective"
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(SOURCE))

import wiring  # noqa: E402  pylint: disable=wrong-import-position
from install import SkillInstaller  # noqa: E402  pylint: disable=wrong-import-position


def _commands(settings: dict) -> list:
    return [h["command"] for entries in settings.get("hooks", {}).values() for e in entries for h in e["hooks"]]


class TestWiring(unittest.TestCase):
    def test_wire_adds_both_hooks_once(self) -> None:
        settings = wiring.wire(wiring.wire({}))
        commands = _commands(settings)
        self.assertEqual(len(commands), 2)
        self.assertEqual(settings["hooks"]["PostToolUse"][0]["matcher"], "Skill")
        self.assertIn("log-skill-use.mjs", commands[0])
        self.assertIn("retrospective-hint.mjs", settings["hooks"]["Stop"][0]["hooks"][0]["command"])

    def test_wire_joins_an_existing_skill_matcher_and_keeps_other_hooks(self) -> None:
        settings = {"hooks": {"PostToolUse": [{"matcher": "Skill", "hooks": [{"type": "command", "command": "other"}]}]}}
        wired = wiring.wire(settings)
        self.assertEqual(len(wired["hooks"]["PostToolUse"]), 1)
        self.assertEqual(len(wired["hooks"]["PostToolUse"][0]["hooks"]), 2)

    def test_unwire_removes_only_its_own_hooks(self) -> None:
        settings = {
            "permissions": {"allow": ["x"]},
            "hooks": {"Stop": [{"hooks": [{"type": "command", "command": "keep-me"}]}]},
        }
        unwired = wiring.unwire(wiring.wire(settings))
        self.assertEqual(_commands(unwired), ["keep-me"])
        self.assertEqual(unwired["permissions"], {"allow": ["x"]})
        self.assertNotIn("PostToolUse", unwired["hooks"])

    def test_unwire_of_a_clean_settings_drops_the_hooks_key(self) -> None:
        self.assertEqual(wiring.unwire(wiring.wire({})), {})


class TestInstallLifecycle(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.published = os.path.join(self.tmp, "published")
        shutil.copytree(SOURCE, os.path.join(self.published, "workflow", "skill-retrospective"))
        self.project = os.path.join(self.tmp, "project")
        os.makedirs(os.path.join(self.project, ".claude"))
        self.settings_path = os.path.join(self.project, ".claude", "settings.local.json")
        with open(self.settings_path, "w", encoding="utf-8") as handle:
            json.dump({"permissions": {"defaultMode": "default"}}, handle)
        self.installer = SkillInstaller(self.published, lambda _config: {})

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp)

    def _settings(self) -> dict:
        with open(self.settings_path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def test_installing_twice_wires_once(self) -> None:
        self.assertTrue(self.installer.install_skill("workflow/skill-retrospective", self.project))
        first = self._settings()
        self.assertTrue(self.installer.install_skill("workflow/skill-retrospective", self.project))
        self.assertEqual(self._settings(), first)
        self.assertEqual(len(_commands(first)), 2)
        self.assertEqual(first["permissions"], {"defaultMode": "default"})

    def test_uninstalling_unwires_the_hooks(self) -> None:
        self.installer.install_skill("workflow/skill-retrospective", self.project)
        self.assertTrue(self.installer.uninstall_skill("skill-retrospective", self.project))
        self.assertEqual(self._settings(), {"permissions": {"defaultMode": "default"}})
        self.assertFalse(os.path.exists(os.path.join(self.project, ".claude", "skills", "skill-retrospective")))


@unittest.skipUnless(shutil.which("git"), "git is not installed")
class TestLocalSettingsWarning(unittest.TestCase):
    def test_warns_only_when_the_settings_file_would_be_committed(self) -> None:
        import post_install  # pylint: disable=import-outside-toplevel

        with tempfile.TemporaryDirectory() as project:
            subprocess.run(["git", "init", "-q"], cwd=project, check=True)
            # a developer's global excludes file may already ignore settings.local.json
            empty_excludes = os.path.join(project, ".git", "no-global-excludes")
            open(empty_excludes, "w", encoding="utf-8").close()
            subprocess.run(["git", "config", "core.excludesFile", empty_excludes], cwd=project, check=True)
            self.assertTrue(post_install._tracked_by_git(project, wiring.SETTINGS))  # pylint: disable=protected-access
            with open(os.path.join(project, ".gitignore"), "w", encoding="utf-8") as handle:
                handle.write(".claude/settings.local.json\n")
            self.assertFalse(post_install._tracked_by_git(project, wiring.SETTINGS))  # pylint: disable=protected-access
        with tempfile.TemporaryDirectory() as no_repo:
            self.assertFalse(post_install._tracked_by_git(no_repo, wiring.SETTINGS))  # pylint: disable=protected-access


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestNodeHooks(unittest.TestCase):
    def test_node_hook_suite_passes(self) -> None:
        result = subprocess.run(
            # the file, not the folder: recent Node versions do not accept a folder argument
            ["node", "--test", str(SOURCE / "hooks" / "hooks.test.mjs")],
            capture_output=True, text=True, encoding="utf-8", check=False
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
