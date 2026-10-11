"""Tests for the savvy-flow skill: published as a plugin whose root is the skill and whose `agents/` folder ships the
five tiered workers, with the upstream licence and attribution travelling alongside."""

from __future__ import annotations

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import REPO, PublishedSkillChecks, frontmatter  # noqa: E402  pylint: disable=wrong-import-position

SKILL = "savvy-flow"
SOURCE = REPO / "skills" / SKILL
PUBLISHED = REPO / "published" / "workflow" / SKILL
MARKETPLACE = REPO / ".claude-plugin" / "marketplace.json"
WORKERS = ("savvy-careful", "savvy-fable", "savvy-heavy", "savvy-light", "savvy-medium")
#: The MIT licence asks for its copyright and permission notice to stay with every copy.
COPYRIGHT = "Copyright (c) 2026 johnnyvizz"
PERMISSION = "The above copyright notice and this permission notice shall be included in all"
ATTRIBUTION = "Originally by johnnyvizz (github.com/johnnyvizz/claude-kit), MIT; imported from main on 2026-10-11."


def _read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


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
