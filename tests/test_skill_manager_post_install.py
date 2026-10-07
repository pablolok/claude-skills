"""Tests for skill-manager Claude Code integration setup."""

import io
import importlib.util
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch


def _load_module(module_name: str, path: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


POST_INSTALL = _load_module(
    "skill_manager_post_install",
    os.path.join("skills", "skill-manager", "post_install.py"),
)
SESSION_START_HOOK = _load_module(
    "skill_manager_session_start_hook",
    os.path.join("skills", "skill-manager", "scripts", "session_start_hook.py"),
)


class TestSkillManagerPostInstall(unittest.TestCase):
    def test_integrate_writes_settings_command_and_runtime_config(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(
                os.environ,
                {
                    "CLAUDE_SKILLS_REPO_ROOT": os.path.abspath("."),
                    "CLAUDE_SKILLS_PUBLISHED_DIR": os.path.abspath("published"),
                },
                clear=False,
            ):
                POST_INSTALL.integrate(temp_dir)

            settings_path = os.path.join(temp_dir, ".claude", "settings.json")
            command_dir = os.path.join(temp_dir, ".claude", "commands", "skill-manager")
            config_path = os.path.join(temp_dir, ".claude", "skills", "skill-manager", "runtime_config.json")
            gitignore_path = os.path.join(temp_dir, ".gitignore")

            self.assertTrue(os.path.exists(settings_path))
            self.assertTrue(os.path.exists(os.path.join(command_dir, "list.md")))
            self.assertTrue(os.path.exists(os.path.join(command_dir, "install.md")))
            self.assertTrue(os.path.exists(os.path.join(command_dir, "update.md")))
            self.assertTrue(os.path.exists(os.path.join(command_dir, "uninstall.md")))
            self.assertTrue(os.path.exists(config_path))
            self.assertTrue(os.path.exists(gitignore_path))
            self.assertTrue(os.path.exists(os.path.join(temp_dir, ".claude", "skill-manager-manifest.json")))

            with open(settings_path, "r", encoding="utf-8") as handle:
                settings = json.load(handle)

            hooks = settings["hooks"]["SessionStart"]
            self.assertEqual(len(hooks), 1)
            self.assertEqual(hooks[0]["matcher"], "startup")
            self.assertEqual(hooks[0]["hooks"][0]["command"], POST_INSTALL.HOOK_COMMAND)
            self.assertIn(".claude/skills/skill-manager/scripts/session_start_hook.py", POST_INSTALL.HOOK_COMMAND)
            self.assertTrue(POST_INSTALL.HOOK_COMMAND.startswith(POST_INSTALL.python_command()))
            self.assertNotIn("python3 ", POST_INSTALL.HOOK_COMMAND)

            with open(os.path.join(command_dir, "update.md"), "r", encoding="utf-8") as handle:
                update_command = handle.read()
            with open(os.path.join(command_dir, "list.md"), "r", encoding="utf-8") as handle:
                list_command = handle.read()
            with open(os.path.join(command_dir, "install.md"), "r", encoding="utf-8") as handle:
                install_command = handle.read()

            self.assertIn("Update installed Claude skills", update_command)
            self.assertIn(POST_INSTALL.python_command() + " .claude/skills/skill-manager/scripts/update_skills.py", update_command)
            self.assertIn(POST_INSTALL.python_command() + " .claude/skills/skill-manager/scripts/list_skills.py", list_command)
            self.assertIn("$ARGUMENTS", install_command)
            self.assertIn(POST_INSTALL.python_command() + " .claude/skills/skill-manager/scripts/install_skills.py", install_command)
            self.assertNotIn("--with-claude", install_command)
            self.assertNotIn("--with-codex", install_command)

            with open(config_path, "r", encoding="utf-8") as handle:
                config = json.load(handle)
            with open(gitignore_path, "r", encoding="utf-8") as handle:
                gitignore = handle.read()

            # Name-agnostic: don't couple to the repo folder name, just the structure.
            self.assertTrue(os.path.isabs(config["source_repo_root"]))
            self.assertEqual(
                config["published_dir"],
                os.path.join(config["source_repo_root"], "published"),
            )
            self.assertIn(".claude/skills/skill-manager/", gitignore)
            self.assertIn(".claude/commands/skill-manager/", gitignore)
            self.assertIn(".claude/settings.json", gitignore)
            self.assertIn(".claude/skill-manager-manifest.json", gitignore)

    def test_integrate_is_idempotent_for_session_start_hook(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(
                os.environ,
                {
                    "CLAUDE_SKILLS_REPO_ROOT": os.path.abspath("."),
                    "CLAUDE_SKILLS_PUBLISHED_DIR": os.path.abspath("published"),
                },
                clear=False,
            ):
                POST_INSTALL.integrate(temp_dir)
                POST_INSTALL.integrate(temp_dir)

            settings_path = os.path.join(temp_dir, ".claude", "settings.json")
            with open(settings_path, "r", encoding="utf-8") as handle:
                settings = json.load(handle)
            with open(os.path.join(temp_dir, ".gitignore"), "r", encoding="utf-8") as handle:
                gitignore = handle.read()

            hooks = settings["hooks"]["SessionStart"]
            self.assertEqual(len(hooks), 1)
            self.assertEqual(len(hooks[0]["hooks"]), 1)
            self.assertEqual(gitignore.count(POST_INSTALL.GITIGNORE_MARKER_START), 1)

    def test_integrate_preserves_existing_gitignore_outside_managed_block(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            gitignore_path = os.path.join(temp_dir, ".gitignore")
            with open(gitignore_path, "w", encoding="utf-8") as handle:
                handle.write("node_modules/\n\n# custom\ncustom-file.txt\n")

            with patch.dict(
                os.environ,
                {
                    "CLAUDE_SKILLS_REPO_ROOT": os.path.abspath("."),
                    "CLAUDE_SKILLS_PUBLISHED_DIR": os.path.abspath("published"),
                },
                clear=False,
            ):
                POST_INSTALL.integrate(temp_dir)

            with open(gitignore_path, "r", encoding="utf-8") as handle:
                gitignore = handle.read()

            self.assertIn("node_modules/", gitignore)
            self.assertIn("custom-file.txt", gitignore)
            self.assertIn(".claude/skills/skill-manager/", gitignore)
            self.assertIn(".claude/commands/skill-manager/", gitignore)
            self.assertIn(".claude/settings.json", gitignore)
            self.assertIn(".claude/skill-manager-manifest.json", gitignore)

    def test_integrate_preserves_existing_settings(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            settings_path = os.path.join(temp_dir, ".claude", "settings.json")
            os.makedirs(os.path.dirname(settings_path), exist_ok=True)
            with open(settings_path, "w", encoding="utf-8") as handle:
                json.dump({"permissions": {"allow": ["Bash(python3:*)"]}}, handle)

            with patch.dict(
                os.environ,
                {
                    "CLAUDE_SKILLS_REPO_ROOT": os.path.abspath("."),
                    "CLAUDE_SKILLS_PUBLISHED_DIR": os.path.abspath("published"),
                },
                clear=False,
            ):
                POST_INSTALL.integrate(temp_dir)

            with open(settings_path, "r", encoding="utf-8") as handle:
                settings = json.load(handle)

            self.assertEqual(settings["permissions"]["allow"], ["Bash(python3:*)"])
            self.assertIn("SessionStart", settings["hooks"])

    def test_integrate_prunes_managed_skills_without_a_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            # 'present' has a directory; 'ghost' does not and should be pruned.
            os.makedirs(os.path.join(temp_dir, ".claude", "skills", "present"))
            manifest_path = os.path.join(temp_dir, ".claude", "skill-manager-manifest.json")
            os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
            with open(manifest_path, "w", encoding="utf-8") as handle:
                json.dump({"claude": ["present", "ghost"]}, handle, indent=2)
                handle.write("\n")

            with patch.dict(
                os.environ,
                {
                    "CLAUDE_SKILLS_REPO_ROOT": os.path.abspath("."),
                    "CLAUDE_SKILLS_PUBLISHED_DIR": os.path.abspath("published"),
                },
                clear=False,
            ):
                POST_INSTALL.integrate(temp_dir)

            with open(os.path.join(temp_dir, ".gitignore"), "r", encoding="utf-8") as handle:
                gitignore = handle.read()
            with open(manifest_path, "r", encoding="utf-8") as handle:
                manifest = json.load(handle)

            self.assertIn(".claude/skills/present/", gitignore)
            self.assertNotIn(".claude/skills/ghost/", gitignore)
            self.assertIn("present", manifest["claude"])
            self.assertNotIn("ghost", manifest["claude"])
            # skill-manager registers itself during integrate.
            self.assertIn("skill-manager", manifest["claude"])


class TestSkillManagerSessionStartHook(unittest.TestCase):
    @patch.object(SESSION_START_HOOK, "check_updates", return_value=[])
    def test_session_start_hook_returns_empty_json_when_no_updates(self, _mock_updates) -> None:
        with patch("sys.stdin", io.StringIO("{}")), io.StringIO() as stdout, redirect_stdout(stdout):
            SESSION_START_HOOK.main()
            self.assertEqual(stdout.getvalue().strip(), "{}")

    @patch.object(
        SESSION_START_HOOK,
        "check_updates",
        return_value=[{"name": "subagent-balancer", "installed": "1.6.0", "latest": "1.6.1"}],
    )
    def test_session_start_hook_reports_updates(self, _mock_updates) -> None:
        with patch("sys.stdin", io.StringIO("{}")), io.StringIO() as stdout, redirect_stdout(stdout):
            SESSION_START_HOOK.main()
            payload = json.loads(stdout.getvalue())
            self.assertIn("/skill-manager:update", payload["systemMessage"])
            self.assertIn("subagent-balancer", payload["systemMessage"])
