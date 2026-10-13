"""Tests for the jira-workflow skill: published as a plugin, its twelve rule groups present, its project values left
to the project's playbook as declared parameters."""

from __future__ import annotations

import pathlib
import re
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import REPO, PublishedSkillChecks  # noqa: E402  pylint: disable=wrong-import-position

SKILL_MD = REPO / "skills" / "jira-workflow" / "SKILL.md"

#: The rule groups, in order: each one is a numbered section of the skill.
RULE_GROUPS = (
    "Jira first",
    "Status moves when the fact happens",
    "Comments",
    "Who does what",
    "Sprints",
    "Estimates",
    "Time tracking",
    "Goals and releases",
    "The total review",
    "The Atlassian connector",
    "In chat",
    "Dependencies between tickets",
)
#: The values a project's playbook must declare, each a row of the parameters table.
PARAMETERS = (
    "Site and `cloudId`",
    "Status cycle",
    "Role labels",
    "Plan labels and sprints",
    "Points constant",
    "Story point field",
    "Where dependencies are written",
)
#: The neutral ticket key the examples use; any other key would be a real project's.
NEUTRAL_KEY = "PROJ"


class TestJiraWorkflowSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = "jira-workflow"

    def setUp(self) -> None:
        self.text = SKILL_MD.read_text(encoding="utf-8")

    def test_every_rule_group_is_a_numbered_section_in_order(self) -> None:
        headings = re.findall(r"^## (\d+)\. (.+)$", self.text, re.M)
        self.assertEqual([int(number) for number, _ in headings], list(range(1, len(RULE_GROUPS) + 1)))
        for (_, title), group in zip(headings, RULE_GROUPS):
            self.assertTrue(title.startswith(group), f"group {group!r} is missing or out of order: {title!r}")

    def test_the_project_values_are_declared_parameters(self) -> None:
        self.assertIn("## Parameters the project declares", self.text)
        for parameter in PARAMETERS:
            with self.subTest(parameter=parameter):
                self.assertIn(f"| {parameter} |", self.text)

    def test_examples_use_only_the_neutral_ticket_key(self) -> None:
        keys = set(re.findall(r"\b([A-Z][A-Z0-9]+)-\d+\b", self.text))
        self.assertEqual(keys, {NEUTRAL_KEY}, "a real project's key belongs in its playbook")

    def test_no_site_specific_field_id(self) -> None:
        self.assertNotRegex(self.text, r"customfield_\d+", "the field id is a parameter of the project")

    def test_an_estimate_is_checked_against_the_real_hours(self) -> None:
        self.assertIn("An estimate must match the real hours", self.text)
        self.assertIn("a gap of more than twice, either way, is a defect", self.text)

    def test_points_go_in_the_field_the_board_measures(self) -> None:
        self.assertIn("Points go in the field the board measures", self.text)
        self.assertIn("move the points to the board's field once", self.text)
        self.assertIn("A report that shows nothing is a defect", self.text)
        self.assertNotIn('statistic is "Story point estimate"', self.text, "the board's field is measured, not assumed")

    def test_the_old_point_field_leaves_the_screens(self) -> None:
        self.assertIn("take the old field off the project's screens", self.text)
        self.assertIn("A locked field stays writable through the API even off every screen", self.text)
        self.assertNotIn("then clear the old field", self.text, "the old field is hidden, not cleared")

    def test_an_epic_has_no_points_and_no_sprint(self) -> None:
        self.assertIn("An Epic has no points in the board's field", self.text)
        self.assertIn("An Epic never goes into a sprint", self.text)
        self.assertNotIn("An Epic sums its children", self.text, "the board counts an Epic's points twice")

    def test_worklog_clock_and_review_script(self) -> None:
        self.assertIn("The finish is the clock, read when logging", self.text)
        self.assertIn("what a query cannot check runs from a script the project keeps", self.text)
        self.assertIn("a hook enforces it", self.text)

    def test_the_dependency_direction_is_stated(self) -> None:
        self.assertIn("`inwardIssue` blocks `outwardIssue`", self.text)
        self.assertIn("is blocked by", self.text)


if __name__ == "__main__":
    unittest.main()
