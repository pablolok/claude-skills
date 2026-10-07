"""Tests for the mermaid-diagrams skill: published as a plugin with its scripts and no node_modules, and its launcher
(bootstrap/mermaid.mjs) — the version it pins, where it finds the skill, when it installs the dependencies, and an
end-to-end check of the smoke test when the dependencies are on this machine."""

from __future__ import annotations

import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import typing
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import PublishedSkillChecks  # noqa: E402  pylint: disable=wrong-import-position

REPO = pathlib.Path(__file__).resolve().parents[1]
SOURCE = REPO / "skills" / "mermaid-diagrams"
PUBLISHED = REPO / "published" / "workflow" / "mermaid-diagrams"
LAUNCHER = PUBLISHED / "bootstrap" / "mermaid.mjs"
PUBLISHED_PATH = pathlib.PurePosixPath("published/workflow/mermaid-diagrams")

#: A stand-in for a skill script: prints its arguments and cwd as JSON and exits with a code no real script uses.
STUB_SCRIPT = (
    'console.log(JSON.stringify({ script: process.argv[1].split(/[\\\\/]/).pop(), '
    'args: process.argv.slice(2), cwd: process.cwd() }));\nprocess.exit(7);\n'
)
INSTALL_LINE = "installing the skill's dependencies"


def _pinned_version() -> str:
    text = (SOURCE / "bootstrap" / "mermaid.mjs").read_text(encoding="utf-8")
    pinned = re.search(r'^const VERSION = "([^"]+)";', text, re.M)
    if pinned is None:
        raise AssertionError("no VERSION line in bootstrap/mermaid.mjs")
    return pinned.group(1)


def _write(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def _stub_skill(folder: pathlib.Path) -> None:
    for script in ("check-mermaid.mjs", "render-svg.mjs"):
        _write(folder / script, STUB_SCRIPT)


def _fake_module(project: pathlib.Path, name: str) -> None:
    _write(project / "node_modules" / name / "package.json", json.dumps({"name": name, "main": "index.js"}))
    _write(project / "node_modules" / name / "index.js", "module.exports = {};\n")


class TestPublishedSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = "mermaid-diagrams"

    def test_the_published_copy_carries_the_scripts_and_the_launcher(self) -> None:
        for rel in ("check-mermaid.mjs", "render-svg.mjs", "render-svg-wsl.mjs", "smoke-test.md", "package.json",
                    "bun.lock", ".mermaid-config.json", ".mermaid-puppeteer.json", "bootstrap/mermaid.mjs"):
            self.assertTrue((PUBLISHED / rel).is_file(), rel)
            self.assertEqual((PUBLISHED / rel).read_bytes(), (SOURCE / rel).read_bytes(), f"publish the skill: {rel}")

    def test_no_node_modules_is_ever_published(self) -> None:
        # The publish copies the whole source folder: a dependency install there would ship with the plugin.
        self.assertFalse((SOURCE / "node_modules").exists(), "remove skills/mermaid-diagrams/node_modules")
        self.assertFalse((PUBLISHED / "node_modules").exists(), "remove the published node_modules")


class TestLauncherVersion(unittest.TestCase):
    def test_the_launcher_pins_the_version_it_ships_with(self) -> None:
        # A project copies the launcher at a release: it must pin that release, not an older one.
        version = json.loads((SOURCE / "metadata.json").read_text(encoding="utf-8"))["version"]
        self.assertEqual(_pinned_version(), version, "bump VERSION in bootstrap/mermaid.mjs with the release")


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestLauncher(unittest.TestCase):
    """The launcher, run from a temp project; the cache is a temp folder, so no test touches the real one."""

    def setUp(self) -> None:
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.project = self.tmp / "project"
        self.project.mkdir()
        self.cache = self.tmp / "cache"

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp)

    def _launch(self, *args: str, skill_dir: typing.Optional[pathlib.Path] = None) -> subprocess.CompletedProcess:
        env = {k: v for k, v in os.environ.items() if k not in ("MERMAID_SKILL_DIR", "CLAUDE_SKILLS_CACHE")}
        env["CLAUDE_SKILLS_CACHE"] = str(self.cache)
        if skill_dir is not None:
            env["MERMAID_SKILL_DIR"] = str(skill_dir)
        return subprocess.run(["node", str(LAUNCHER), *args], cwd=self.project, env=env,
                              capture_output=True, text=True, encoding="utf-8", check=False)

    def _ran(self, result: subprocess.CompletedProcess) -> typing.Dict[str, typing.Any]:
        self.assertEqual(result.returncode, 7, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_the_env_var_names_the_skill_and_the_call_passes_through(self) -> None:
        skill = self.tmp / "skill"
        _stub_skill(skill)
        ran = self._ran(self._launch("check", "docs/a.md", "--flag", skill_dir=skill))
        self.assertEqual(ran["script"], "check-mermaid.mjs")
        self.assertEqual(ran["args"], ["docs/a.md", "--flag"])
        self.assertEqual(pathlib.Path(ran["cwd"]).resolve(), self.project.resolve(), "the cwd stays the caller's")
        self.assertEqual(self._ran(self._launch("render", "docs/diagrams", skill_dir=skill))["script"], "render-svg.mjs")

    def test_an_unknown_or_missing_subcommand_gives_the_usage(self) -> None:
        for args in (("draw", "x.md"), ()):
            result = self._launch(*args)
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertIn("usage: node mermaid.mjs check", result.stderr)
        self.assertFalse(self.cache.exists(), "the usage comes before any fetch")

    def _cached_clone(self) -> pathlib.Path:
        folder = self.cache / f"mermaid-diagrams@{_pinned_version()}" / PUBLISHED_PATH
        _stub_skill(folder)
        # No dependencies: an install here is offline and quick, and leaves mermaid unresolved.
        _write(folder / "package.json", json.dumps({"name": "stub-skill", "private": True}))
        return folder

    @unittest.skipUnless(shutil.which("bun") or shutil.which("npm"), "bun or npm is needed")
    def test_a_cached_clone_without_the_deps_gets_them_installed(self) -> None:
        self._cached_clone()
        result = self._launch("check", "a.md")
        self._ran(result)
        self.assertEqual(result.stdout.count(INSTALL_LINE), 1, result.stdout)

    def test_a_project_that_has_the_deps_never_installs(self) -> None:
        self._cached_clone()
        for name in ("mermaid", "jsdom"):
            _fake_module(self.project, name)
        result = self._launch("check", "a.md")
        self._ran(result)
        self.assertNotIn(INSTALL_LINE, result.stdout)

    def test_a_skill_named_by_the_env_var_never_installs(self) -> None:
        skill = self.tmp / "skill"
        _stub_skill(skill)
        result = self._launch("check", "a.md", skill_dir=skill)
        self._ran(result)
        self.assertNotIn(INSTALL_LINE, result.stdout)


def _deps_root() -> typing.Optional[pathlib.Path]:
    """A folder whose node_modules has mermaid and jsdom: MERMAID_DEPS_DIR, else a copy already on this machine."""
    cache = pathlib.Path(os.environ.get("CLAUDE_SKILLS_CACHE") or pathlib.Path.home() / ".cache" / "claude-skills")
    candidates = [os.environ.get("MERMAID_DEPS_DIR"), pathlib.Path.home() / ".claude" / "skills" / "mermaid-diagrams",
                  *sorted(cache.glob(f"mermaid-diagrams@*/{PUBLISHED_PATH}"), reverse=True)]
    for candidate in candidates:
        if candidate and all((pathlib.Path(candidate) / "node_modules" / name / "package.json").is_file()
                             for name in ("mermaid", "jsdom")):
            return pathlib.Path(candidate)
    return None


@unittest.skipUnless(shutil.which("node") and _deps_root(), "node, or mermaid + jsdom installed on this machine, missing")
class TestSmokeTestEndToEnd(unittest.TestCase):
    def test_check_passes_on_the_smoke_test_through_the_launcher(self) -> None:
        # The published skill has no node_modules: the deps come from the cwd, as they do from a project.
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_SKILLS_CACHE"}
        env["MERMAID_SKILL_DIR"] = str(PUBLISHED)
        result = subprocess.run(["node", str(LAUNCHER), "check", str(PUBLISHED / "smoke-test.md")],
                                cwd=_deps_root(), env=env, capture_output=True, text=True, encoding="utf-8",
                                check=False, timeout=300)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        # Control: the six blocks were found and checked (a file with no block found also exits 0).
        self.assertIn("6 diagram(s)", result.stdout)
        self.assertEqual(result.stdout.count(" OK "), 6, result.stdout)


if __name__ == "__main__":
    unittest.main()
