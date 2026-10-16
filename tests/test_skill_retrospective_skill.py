"""Tests for the skill-retrospective skill: its plugin declares the skill log alone, and its Node hook suite passes."""

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
    """The plugin wires one hook, the skill log; no Stop hook holds a turn — the close of the work asks instead."""

    def test_only_the_skill_log_is_declared_and_shipped(self) -> None:
        entry = json.loads((PUBLISHED / "plugin-entry.json").read_text(encoding="utf-8"))
        self.assertEqual(list(entry["hooks"]), ["PostToolUse"], "no Stop hook: the close steps invoke the skill")
        self.assertEqual(entry["hooks"]["PostToolUse"][0]["matcher"], "Skill")
        commands = [hook["command"] for event in entry["hooks"].values() for group in event for hook in group["hooks"]]
        self.assertEqual(len(commands), 1)
        self.assertIn("${CLAUDE_PLUGIN_ROOT}/hooks/log-skill-use.mjs", commands[0])
        self.assertTrue((PUBLISHED / "hooks" / "log-skill-use.mjs").is_file())
        self.assertFalse((PUBLISHED / "hooks" / "retrospective-hint.mjs").exists(), "publish the removal")


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestNodeHooks(unittest.TestCase):
    def test_node_hook_suite_passes(self) -> None:
        result = subprocess.run(
            # the file, not the folder: recent Node versions do not accept a folder argument
            ["node", "--test", str(SOURCE / "hooks" / "hooks.test.mjs")],
            capture_output=True, text=True, encoding="utf-8", check=False
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_transcript_signals_suite_passes_and_ships(self) -> None:
        result = subprocess.run(
            ["node", "--test", str(SOURCE / "scripts" / "transcript-signals.test.mjs")],
            capture_output=True, text=True, encoding="utf-8", check=False
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue((PUBLISHED / "scripts" / "transcript-signals.mjs").is_file())


if __name__ == "__main__":
    unittest.main()
