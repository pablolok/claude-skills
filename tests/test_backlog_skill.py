"""Tests for the backlog skill: a real install, its gates run on a project that has it, and its Node suite."""

from __future__ import annotations

import glob
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
SOURCE = REPO / "skills" / "backlog"
sys.path.insert(0, str(REPO))

from install import SkillInstaller  # noqa: E402  pylint: disable=wrong-import-position

REGISTER = """# Backlog

## Pending verification
Nothing pending.

## Open

## BKLG-001 — Checkout drops the discount on retry
- **Status**: open
- **Priority**: high
- **Added**: 2026-10-07
- **Manual**: no
- **Architecture**: —
- **Doc**: [bugs/checkout-retry/plan.md](bugs/checkout-retry/plan.md)
- **Summary**: A retried payment rebuilds the cart without the code.
"""


def _write(root: str, rel: str, text: str) -> None:
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


class TestInstall(unittest.TestCase):
    def test_install_copies_the_skill_and_its_scripts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            published = os.path.join(tmp, "published")
            shutil.copytree(SOURCE, os.path.join(published, "workflow", "backlog"))
            project = os.path.join(tmp, "project")
            os.makedirs(project)
            installer = SkillInstaller(published, lambda _config: {})
            self.assertTrue(installer.install_skill("workflow/backlog", project))
            installed = os.path.join(project, ".claude", "skills", "backlog")
            for rel in ("SKILL.md", "scripts/check-doc-refs.mjs", "scripts/backlog-github-sync.mjs", "scripts/project.mjs"):
                self.assertTrue(os.path.isfile(os.path.join(installed, rel)), rel)
            self.assertTrue(installer.uninstall_skill("backlog", project))
            self.assertFalse(os.path.exists(installed))


@unittest.skipUnless(shutil.which("node") and shutil.which("git"), "node and git are needed")
class TestGatesOnAProject(unittest.TestCase):
    """The gates run from the installed copy, on the project — and the skill's own docs never turn them red."""

    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.project = os.path.join(self.tmp, "project")
        # Installed WITHOUT the managed .gitignore, so the gate also reads the skill's own SKILL.md and README.
        shutil.copytree(SOURCE, os.path.join(self.project, ".claude", "skills", "backlog"))
        _write(self.project, "docs/implementations/BACKLOG.md", REGISTER)
        _write(self.project, "docs/implementations/bugs/checkout-retry/plan.md", "# plan\n")
        subprocess.run(["git", "init", "-q"], cwd=self.project, check=True)
        self.scripts = os.path.join(self.project, ".claude", "skills", "backlog", "scripts")

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp)

    def _gate(self, script: str, *args: str, cwd: str = "") -> subprocess.CompletedProcess:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_PROJECT_DIR"}
        return subprocess.run(
            ["node", os.path.join(self.scripts, script), *args],
            cwd=cwd or os.path.join(self.project, "docs"), env=env,
            capture_output=True, text=True, encoding="utf-8", check=False,
        )

    def test_a_clean_project_passes_every_gate_from_a_subfolder(self) -> None:
        _write(self.project, "docs/implementations/BACKLOG-HISTORY.md", "# History\n- **BKLG-000** the first, closed\n")
        gates = (("check-doc-refs.mjs", ()), ("backlog-anchor.mjs", ("--all",)), ("architecture-shape.mjs", ()),
                 ("backlog-coherence.mjs", ()), ("closed-defects.mjs", ()), ("related-docs.mjs", ()))
        for script, args in gates:
            result = self._gate(script, *args)
            self.assertEqual(result.returncode, 0, f"{script}\n{result.stdout}{result.stderr}")
        # Control: the gate did read this project (its activity folder), not the scripts' own tree.
        self.assertIn("activity folders: 1 · claimed by an open entry: 1", self._gate("check-doc-refs.mjs").stdout)

    def test_an_orphan_folder_and_a_bare_id_turn_it_red(self) -> None:
        _write(self.project, "docs/implementations/features/forgotten/spec.md", "# spec\n")
        _write(self.project, "docs/notes.md", "see BKLG-001\n")
        result = self._gate("check-doc-refs.mjs")
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("[folder]", result.stdout)
        self.assertIn("BKLG-001 without double brackets", result.stdout)

    def test_the_project_config_moves_the_register(self) -> None:
        shutil.move(os.path.join(self.project, "docs", "implementations"), os.path.join(self.project, "handbook"))
        _write(self.project, ".claude/backlog.json", '{ "docsDir": "handbook" }\n')
        result = self._gate("check-doc-refs.mjs", cwd=self.project)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("claimed by an open entry: 1", result.stdout)

    def test_a_typo_in_the_config_stops_the_gate(self) -> None:
        _write(self.project, ".claude/backlog.json", '{ "docDir": "handbook" }\n')
        result = self._gate("check-doc-refs.mjs")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('unknown key "docDir"', result.stderr)


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestNodeSuite(unittest.TestCase):
    def test_node_suite_passes(self) -> None:
        # the files, not the folder: recent Node versions do not accept a folder argument
        files = sorted(glob.glob(str(SOURCE / "scripts" / "*.test.mjs")))
        self.assertGreaterEqual(len(files), 6)
        result = subprocess.run(["node", "--test", *files], capture_output=True, text=True, encoding="utf-8", check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
