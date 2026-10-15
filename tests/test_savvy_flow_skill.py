"""Tests for the savvy-flow skill: published as a plugin whose root is the skill and whose `agents/` folder ships the
five tiered workers, with the upstream licence and attribution travelling alongside."""

from __future__ import annotations

import json
import pathlib
import sys
import typing
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import REPO, PublishedSkillChecks, frontmatter  # noqa: E402  pylint: disable=wrong-import-position

SKILL = "savvy-flow"
SOURCE = REPO / "skills" / SKILL
PUBLISHED = REPO / "published" / "workflow" / SKILL
MARKETPLACE = REPO / ".claude-plugin" / "marketplace.json"
WORKERS = ("savvy-careful", "savvy-fable", "savvy-heavy", "savvy-light", "savvy-medium")
#: The tiers that run with a tool allowlist rather than every tool the parent has.
LEAN_WORKERS = ("savvy-light", "savvy-medium")
#: The MIT licence asks for its copyright and permission notice to stay with every copy.
COPYRIGHT = "Copyright (c) 2026 johnnyvizz"
PERMISSION = "The above copyright notice and this permission notice shall be included in all"
ATTRIBUTION = "Originally by johnnyvizz (github.com/johnnyvizz/claude-kit), MIT; imported from main on 2026-10-11."
#: The host app's MCP servers for its task list and turn summary, and for separate sessions: a worker reports to the
#: orchestrator, so it gets neither.
HOST_ORCHESTRATION_SERVERS = {"mcp__ccd_turn", "mcp__ccd_session"}


def _read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def _flat(text: str) -> str:
    """The text with every run of whitespace as one space, so a rule reads the same however its lines wrap."""
    return " ".join(text.split())


def _flow_list(value: str) -> typing.Set[str]:
    """The items of a one-line YAML flow sequence such as ``[a, b]``."""
    return {item.strip() for item in value.strip().removeprefix("[").removesuffix("]").split(",") if item.strip()}


class TestSavvyFlowSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = SKILL


class TestWorkers(unittest.TestCase):
    """The five workers ship in the plugin's `agents/` folder, as the source has them."""

    def test_the_five_workers_are_published_as_the_source(self) -> None:
        expected = [f"{name}.md" for name in WORKERS]
        self.assertEqual(sorted(path.name for path in (SOURCE / "agents").glob("*.md")), expected)
        self.assertEqual(sorted(path.name for path in (PUBLISHED / "agents").glob("*.md")), expected, "publish the skill")
        for name in expected:
            self.assertEqual(_read(PUBLISHED / "agents" / name), _read(SOURCE / "agents" / name), name)

    def test_each_worker_is_named_by_its_file_and_runs_on_a_model(self) -> None:
        for name in WORKERS:
            with self.subTest(worker=name):
                fields = frontmatter(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertEqual(fields.get("name"), name)
                self.assertTrue(fields.get("model"), "a worker names its model")
                self.assertTrue(fields.get("description"))

    def test_each_worker_is_denied_the_host_task_list_and_session_tools(self) -> None:
        for name in WORKERS:
            with self.subTest(worker=name):
                fields = frontmatter(_read(PUBLISHED / "agents" / f"{name}.md"))
                self.assertEqual(_flow_list(fields.get("disallowedTools", "")), HOST_ORCHESTRATION_SERVERS)

    def test_the_lean_workers_keep_files_shell_and_progress_and_nothing_else(self) -> None:
        # Light and Medium start without the listing of every tool and skill, which is most of a fresh worker's
        # context; they keep what their tasks use and the step tool the agents panel reads.
        for name in LEAN_WORKERS:
            with self.subTest(worker=name):
                tools = _flow_list(frontmatter(_read(PUBLISHED / "agents" / f"{name}.md")).get("tools", ""))
                self.assertTrue({"Read", "Edit", "Write", "Bash", "ToolSearch", "mcp__savvy-progress"} <= tools)
                self.assertFalse({"Skill", "Agent"} & tools, "a lean worker loads no skill and spawns no agent")
        for name in set(WORKERS) - set(LEAN_WORKERS):
            with self.subTest(worker=name):
                self.assertNotIn("tools", frontmatter(_read(PUBLISHED / "agents" / f"{name}.md")))

    def test_the_plugin_root_brings_the_agents_with_it(self) -> None:
        # Claude Code finds `agents/` at the plugin root (savvy-flow:savvy-careful and so on) under the default
        # entry; declaring them too would register each worker twice, and an own manifest would conflict with it.
        [entry] = [plugin for plugin in json.loads(_read(MARKETPLACE))["plugins"] if plugin["name"] == SKILL]
        self.assertEqual(entry["skills"], ["./"])
        self.assertIs(entry["strict"], False)
        self.assertNotIn("agents", entry)
        self.assertFalse((PUBLISHED / ".claude-plugin").exists())


class TestSkill(unittest.TestCase):
    def test_the_skill_runs_only_when_named(self) -> None:
        fields = frontmatter(_read(PUBLISHED / "SKILL.md"))
        self.assertEqual(fields.get("disable-model-invocation"), "true")
        self.assertEqual(fields.get("argument-hint"), "<task description>")

    def test_the_skill_names_every_worker_it_delegates_to(self) -> None:
        text = _read(PUBLISHED / "SKILL.md")
        for name in WORKERS:
            self.assertIn(f"`{name}`", text)


class TestHostTools(unittest.TestCase):
    """A host's own task list, turn summary and sessions run alongside the flow, never in place of it."""

    def setUp(self) -> None:
        self.text = _flat(_read(PUBLISHED / "SKILL.md"))

    def test_the_host_task_list_holds_the_tiered_plan_and_the_progress_bar_stays(self) -> None:
        self.assertIn("**The host's task list holds the plan.** Its steps are the worker tasks, in plan order, each led "
                      "by its tier", self.text)
        self.assertIn("a step is done when its task is accepted in review (section 5), not when the worker returns",
                      self.text)
        self.assertIn("The progress bar stays current as well.", self.text)

    def test_workers_are_never_moved_to_a_separate_session(self) -> None:
        self.assertIn("**Workers are always Agent tool calls.** Never move a worker task to a separate session",
                      self.text)

    def test_a_turn_summary_does_not_close_the_flow(self) -> None:
        self.assertIn("**A turn summary closes a turn, not the flow.**", self.text)
        self.assertIn("Section 6 runs once, after the last task is accepted.", self.text)


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
