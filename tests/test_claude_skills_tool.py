"""End-to-end tests for bootstrap/claude-skills.mjs: managed copies of published skills in a project.

A local bare origin holds a fake ``published/workflow/<skill>/`` tree with real ``<skill>@x.y.z`` tags, and a fake
project carries the tool as ``scripts/claude-skills.mjs`` (the way a project copies it), so no network is used. The
pure decisions (tree diff, latest version, hook wiring) are unit-tested in bootstrap/claude-skills.test.mjs, run here.
"""

from __future__ import annotations

import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOL = ROOT / "bootstrap" / "claude-skills.mjs"
UNIT_TESTS = ROOT / "bootstrap" / "claude-skills.test.mjs"

HOOKS = {
    "hooks": {
        "PostToolUse": [
            {"matcher": "Skill", "hooks": [{"type": "command", "command": 'node "${CLAUDE_PLUGIN_ROOT}/hooks/h.mjs"', "timeout": 10}]}
        ],
        "Stop": [{"hooks": [{"type": "command", "command": 'node "${CLAUDE_PLUGIN_ROOT}/hooks/stop.mjs"', "timeout": 10}]}],
    }
}


LAUNCHER = "plain-run.mjs"


def _launcher(version: str) -> str:
    """A skill's launcher as published in its bootstrap/ folder: it pins the skill's version in its VERSION line."""
    return f'#!/usr/bin/env node\nconst SKILL = "plain";\nconst VERSION = "{version}";\nconsole.log(SKILL, VERSION);\n'


def _git(cwd: pathlib.Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


def _write(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))


@unittest.skipUnless(shutil.which("node") and shutil.which("git"), "node and git are needed")
class TestClaudeSkillsTool(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.origin = self.tmp / "origin.git"
        self.cache = self.tmp / "cache"
        self._publish_origin()
        self.project = self.tmp / "project"
        self.project.mkdir()
        _git(self.project, "init", "-q")
        (self.project / "scripts").mkdir()
        shutil.copy(TOOL, self.project / "scripts" / "claude-skills.mjs")
        self._write_config(self.origin.as_posix(), [])
        _write(self.project / ".claude" / "skills" / "own" / "SKILL.md", "the project's own skill\n")

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp, ignore_errors=True)

    # ---- fixture -------------------------------------------------------------------------------------------------

    def _publish_origin(self) -> None:
        src = self.tmp / "src"
        _git(self.tmp, "init", "-q", "--bare", str(self.origin))
        _git(self.tmp, "init", "-q", str(src))
        for key, value in (("user.name", "t"), ("user.email", "t@example.com"), ("commit.gpgsign", "false"),
                           ("core.autocrlf", "false")):
            _git(src, "config", key, value)
        _git(src, "remote", "add", "origin", str(self.origin))
        plain = src / "published" / "workflow" / "plain"
        hooked = src / "published" / "workflow" / "hooked"
        self._skill(plain, "plain", "1.0.0", {"SKILL.md": "plain one\n", "OLD.md": "old\n", "lib/a.mjs": "a\n",
                                              f"bootstrap/{LAUNCHER}": _launcher("1.0.0")})
        self._skill(hooked, "hooked", "1.0.0", {"SKILL.md": "hooked\n", "hooks/h.mjs": "h\n", "hooks/stop.mjs": "s\n",
                                                "plugin-entry.json": json.dumps(HOOKS, indent=2) + "\n"})
        self._commit_and_tag(src, ["plain@1.0.0", "hooked@1.0.0", "plainer@9.0.0"])
        (plain / "OLD.md").unlink()
        self._skill(plain, "plain", "1.1.0", {"SKILL.md": "plain two\n", "NEW.md": "new\n",
                                              f"bootstrap/{LAUNCHER}": _launcher("1.1.0"),
                                              ".claude-plugin/plugin.json": json.dumps({"name": "plain"}) + "\n"})
        self._commit_and_tag(src, ["plain@1.1.0"])
        _git(src, "push", "-q", "origin", "HEAD:refs/heads/main", "--tags")

    @staticmethod
    def _skill(folder: pathlib.Path, name: str, version: str, files: dict) -> None:
        _write(folder / "metadata.json", json.dumps({"name": name, "version": version}) + "\n")
        for rel, text in files.items():
            _write(folder / rel, text)

    @staticmethod
    def _commit_and_tag(src: pathlib.Path, tags: list) -> None:
        _git(src, "add", "-A")
        _git(src, "commit", "-q", "-m", "publish")
        for tag in tags:
            _git(src, "tag", tag)

    def _write_config(self, repo: str, skills: list) -> None:
        _write(self.project / ".claude" / "claude-skills.json", json.dumps({"repo": repo, "skills": skills}) + "\n")

    def _config(self) -> dict:
        return json.loads((self.project / ".claude" / "claude-skills.json").read_text(encoding="utf-8"))

    def _run(self, *args: str) -> subprocess.CompletedProcess:
        env = {**os.environ, "CLAUDE_SKILLS_CACHE": str(self.cache)}
        return subprocess.run(["node", str(self.project / "scripts" / "claude-skills.mjs"), *args], cwd=self.project,
                              capture_output=True, text=True, encoding="utf-8", env=env, check=False)

    def _ok(self, *args: str) -> str:
        result = self._run(*args)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def _copy(self, skill: str) -> pathlib.Path:
        return self.project / ".claude" / "skills" / skill

    def _wire(self, settings_file: str, events: dict) -> None:
        _write(self.project / ".claude" / settings_file, json.dumps({"hooks": events}, indent=2) + "\n")

    def _project_launcher(self) -> pathlib.Path:
        return self.project / "scripts" / LAUNCHER

    # ---- sync ----------------------------------------------------------------------------------------------------

    def test_sync_installs_the_published_copy_and_lists_it(self) -> None:
        out = self._ok("sync", "plain@1.0.0")
        self.assertEqual((self._copy("plain") / "SKILL.md").read_text(encoding="utf-8"), "plain one\n")
        self.assertTrue((self._copy("plain") / "lib" / "a.mjs").is_file())
        self.assertEqual(self._config()["skills"], ["plain"])
        self.assertNotIn("version", json.dumps(self._config()["skills"]))
        self.assertIn("plain: (new) -> 1.0.0", out)
        self.assertIn("added   SKILL.md", out)
        self.assertEqual((self._copy("own") / "SKILL.md").read_text(encoding="utf-8"), "the project's own skill\n")
        self.assertIn("plain 1.0.0", self._ok("list"))
        out.encode("ascii")

    def test_sync_to_the_latest_tag_reports_what_changed(self) -> None:
        self._ok("sync", "plain@1.0.0")
        out = self._ok("sync", "plain")
        self.assertIn("plain: 1.0.0 -> 1.1.0", out)
        self.assertIn("changed SKILL.md", out)
        self.assertIn("changed metadata.json", out)
        self.assertIn("added   NEW.md", out)
        self.assertIn("removed OLD.md", out)
        self.assertFalse((self._copy("plain") / "OLD.md").exists())
        self.assertEqual(self._config()["skills"], ["plain"])

    def test_sync_refuses_a_folder_it_does_not_manage(self) -> None:
        _write(self._copy("plain") / "SKILL.md", "a hand-made copy\n")
        result = self._run("sync", "plain@1.0.0")
        self.assertEqual(result.returncode, 1)
        self.assertIn("not managed", result.stdout + result.stderr)
        self.assertIn("--adopt", result.stdout + result.stderr)
        self.assertEqual((self._copy("plain") / "SKILL.md").read_text(encoding="utf-8"), "a hand-made copy\n")
        self.assertEqual(self._config()["skills"], [])

    def test_sync_adopt_replaces_an_unmanaged_folder_and_shows_the_diff(self) -> None:
        _write(self._copy("plain") / "SKILL.md", "a hand-made copy\n")
        _write(self._copy("plain") / "mine.md", "local\n")
        out = self._ok("sync", "plain@1.0.0", "--adopt")
        self.assertIn("adopt", out)
        self.assertIn("changed SKILL.md", out)
        self.assertIn("removed mine.md", out)
        self.assertEqual((self._copy("plain") / "SKILL.md").read_text(encoding="utf-8"), "plain one\n")
        self.assertEqual(self._config()["skills"], ["plain"])

    def test_sync_of_an_unknown_version_fails_and_changes_nothing(self) -> None:
        result = self._run("sync", "plain@7.7.7")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self._copy("plain").exists())
        self.assertEqual(self._config()["skills"], [])

    def test_sync_updates_the_project_launcher_and_reports_its_versions(self) -> None:
        _write(self._project_launcher(), _launcher("1.0.0"))
        self._ok("sync", "plain@1.0.0")
        out = self._ok("sync", "plain")
        self.assertIn(f"launcher scripts/{LAUNCHER} 1.0.0 -> 1.1.0", out)
        self.assertEqual(self._project_launcher().read_text(encoding="utf-8"), _launcher("1.1.0"))
        self._ok("check")

    def test_sync_does_not_create_a_missing_launcher_but_offers_it(self) -> None:
        out = self._ok("sync", "plain@1.1.0")
        self.assertFalse(self._project_launcher().exists())
        self.assertIn(f"bootstrap/{LAUNCHER}", out)
        self.assertIn(f"scripts/{LAUNCHER}", out)
        self.assertNotIn("launcher scripts/", out)
        out.encode("ascii")

    # ---- check ---------------------------------------------------------------------------------------------------

    def test_check_is_green_on_an_untouched_copy(self) -> None:
        self._ok("sync", "plain@1.1.0")
        out = self._ok("check")
        self.assertIn("plain 1.1.0", out)

    def test_check_fails_on_a_hand_edited_file(self) -> None:
        self._ok("sync", "plain@1.1.0")
        _write(self._copy("plain") / "SKILL.md", "plain two, edited here\n")
        _write(self._copy("plain") / "extra.md", "added by hand\n")
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn("changed SKILL.md", result.stdout)
        self.assertIn("added   extra.md", result.stdout)

    def test_sync_leaves_out_the_plugin_manifest(self) -> None:
        # A copy carrying .claude-plugin/ is loaded as a second plugin of the same name, which collides with the
        # installed one: managed copies are skills, never plugins.
        out = self._ok("sync", "plain@1.1.0")
        self.assertFalse((self._copy("plain") / ".claude-plugin").exists())
        self.assertNotIn(".claude-plugin", out)
        self.assertTrue((self._copy("plain") / "NEW.md").is_file())

    def test_check_ignores_and_sync_removes_a_plugin_manifest_left_by_an_older_tool(self) -> None:
        self._ok("sync", "plain@1.1.0")
        _write(self._copy("plain") / ".claude-plugin" / "plugin.json", json.dumps({"name": "plain"}) + "\n")
        self._ok("check")
        self._ok("sync", "plain@1.1.0")
        self.assertFalse((self._copy("plain") / ".claude-plugin").exists())

    def test_check_passes_when_only_line_endings_differ(self) -> None:
        self._ok("sync", "plain@1.1.0")
        (self._copy("plain") / "SKILL.md").write_bytes(b"plain two\r\n")
        _write(self._copy("plain") / "node_modules" / "dep" / "index.js", "ignored\n")
        self._ok("check")

    def test_check_fails_on_a_missing_folder_and_on_metadata_naming_another_skill(self) -> None:
        self._ok("sync", "plain@1.1.0")
        shutil.rmtree(self._copy("plain"))
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn("missing", result.stdout)
        self._ok("sync", "plain@1.1.0")
        _write(self._copy("plain") / "metadata.json", json.dumps({"name": "other", "version": "1.1.0"}) + "\n")
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn("other", result.stdout)

    def test_check_reports_missing_hook_wiring_with_the_snippet(self) -> None:
        self._ok("sync", "hooked@1.0.0")
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn("hooks not wired", result.stdout)
        self.assertIn(".claude/skills/hooked/hooks/h.mjs", result.stdout)
        snippet = json.loads(result.stdout[result.stdout.index("{"):result.stdout.rindex("}") + 1])
        self.assertEqual(set(snippet["hooks"]), {"PostToolUse", "Stop"})
        self.assertEqual(snippet["hooks"]["PostToolUse"][0]["matcher"], "Skill")

    def test_check_accepts_hooks_wired_across_both_settings_files(self) -> None:
        self._ok("sync", "hooked@1.0.0")
        self._wire("settings.json", {"PostToolUse": [{"matcher": "Skill", "hooks": [
            {"type": "command", "command": 'node "$CLAUDE_PROJECT_DIR"/.claude/skills/hooked/hooks/h.mjs'}]}]})
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn("stop.mjs", result.stdout)
        self.assertNotIn("hooks/h.mjs", result.stdout)
        self._wire("settings.local.json", {"Stop": [{"hooks": [
            {"type": "command", "command": 'node "${CLAUDE_PROJECT_DIR}/.claude/skills/hooked/hooks/stop.mjs"'}]}]})
        self._ok("check")

    def test_check_reports_a_hook_under_another_matcher_as_missing(self) -> None:
        self._ok("sync", "hooked@1.0.0")
        command = {"type": "command", "command": 'node "$CLAUDE_PROJECT_DIR/.claude/skills/hooked/hooks/h.mjs"'}
        stop = {"type": "command", "command": 'node "$CLAUDE_PROJECT_DIR/.claude/skills/hooked/hooks/stop.mjs"'}
        self._wire("settings.json", {"PostToolUse": [{"matcher": "Edit", "hooks": [command]}], "Stop": [{"hooks": [stop]}]})
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn("hooks/h.mjs", result.stdout)

    def test_check_reports_newer_published_versions_as_info(self) -> None:
        self._ok("sync", "plain@1.0.0")
        out = self._ok("check")
        self.assertIn("plain: 1.0.0 -> 1.1.0 available", out)
        self.assertNotIn("9.0.0", out)

    def test_check_offline_is_not_a_failure(self) -> None:
        self._ok("sync", "plain@1.1.0")
        self._write_config((self.tmp / "no-such-origin.git").as_posix(), ["plain"])
        out = self._ok("check")
        self.assertIn("could not check for updates", out)

    def test_check_with_nothing_managed_is_green(self) -> None:
        (self.project / ".claude" / "claude-skills.json").unlink()
        self.assertIn("no managed skills", self._ok("check"))

    def test_check_passes_when_the_launcher_matches_line_endings_aside(self) -> None:
        _write(self._project_launcher(), _launcher("1.1.0"))
        self._ok("sync", "plain@1.1.0")
        self._ok("check")
        self._project_launcher().write_bytes(_launcher("1.1.0").replace("\n", "\r\n").encode("utf-8"))
        self._ok("check")

    def test_check_fails_on_a_launcher_pinned_to_another_version(self) -> None:
        _write(self._project_launcher(), _launcher("1.1.0"))
        self._ok("sync", "plain@1.1.0")
        _write(self._project_launcher(), _launcher("1.0.0"))
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        error = next(line for line in result.stdout.splitlines() if line.startswith("ERROR") and LAUNCHER in line)
        self.assertIn("VERSION 1.0.0", error)
        self.assertIn("plain 1.1.0", error)
        self.assertIn("node scripts/claude-skills.mjs sync plain@1.1.0", error)

    def test_check_fails_on_a_hand_edited_launcher(self) -> None:
        _write(self._project_launcher(), _launcher("1.1.0"))
        self._ok("sync", "plain@1.1.0")
        _write(self._project_launcher(), _launcher("1.1.0") + "// edited here\n")
        result = self._run("check")
        self.assertEqual(result.returncode, 1)
        self.assertIn(f"scripts/{LAUNCHER} differs", result.stdout)
        self.assertIn("sync plain@1.1.0", result.stdout)


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TestClaudeSkillsUnits(unittest.TestCase):
    def test_the_pure_decisions_pass(self) -> None:
        result = subprocess.run(["node", "--test", str(UNIT_TESTS)], capture_output=True, text=True, encoding="utf-8",
                                check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
