"""Tests for the skill-retrospective skill: its plugin declares the two hooks, and its Node hook suite passes."""

from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
SOURCE = REPO / "skills" / "skill-retrospective"
PUBLISHED = REPO / "published" / "workflow" / "skill-retrospective"


class TestPluginEntry(unittest.TestCase):
    """The plugin wires the hooks: each declared command runs a hook file the published folder carries."""

    def test_both_hooks_are_declared_and_shipped(self) -> None:
        entry = json.loads((PUBLISHED / "plugin-entry.json").read_text(encoding="utf-8"))
        self.assertEqual(entry["hooks"]["PostToolUse"][0]["matcher"], "Skill")
        commands = [hook["command"] for event in entry["hooks"].values() for group in event for hook in group["hooks"]]
        self.assertEqual(len(commands), 2)
        for script in ("log-skill-use.mjs", "retrospective-hint.mjs"):
            [command] = [command for command in commands if script in command]
            self.assertIn("${CLAUDE_PLUGIN_ROOT}/hooks/", command)
            self.assertTrue((PUBLISHED / "hooks" / script).is_file(), script)


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
