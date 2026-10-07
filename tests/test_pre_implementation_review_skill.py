"""Tests for the pre-implementation review skill: published as a plugin, and the rules its SKILL.md must keep."""

from __future__ import annotations

import pathlib
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
SOURCE = REPO / "skills" / "pre-implementation-review"
PUBLISHED = REPO / "published" / "workflow" / "pre-implementation-review"


def _read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


class TestPreImplementationReviewSkill(unittest.TestCase):
    def test_skill_is_published_in_the_workflow_category(self) -> None:
        self.assertTrue((PUBLISHED / "SKILL.md").is_file())
        self.assertEqual(_read(PUBLISHED / "SKILL.md"), _read(SOURCE / "SKILL.md"), "publish the skill")

    def test_source_skill_exists(self) -> None:
        self.assertIn("pre-implementation-review", _read(SOURCE / "SKILL.md"))

    def test_skill_recommends_enums_over_raw_numeric_codes(self) -> None:
        content = _read(SOURCE / "SKILL.md")
        self.assertIn("numeric state/category/status codes", content)
        self.assertIn("Prefer enums or typed named constants over raw numeric codes", content)

    def test_skill_recommends_shared_frontend_styling_primitives(self) -> None:
        content = _read(SOURCE / "SKILL.md")
        self.assertIn("repeated component-local CSS or SCSS", content)
        self.assertIn("Prefer shared styling primitives, design tokens, or utility layers", content)

    def test_skill_recommends_themeable_color_tokens(self) -> None:
        content = _read(SOURCE / "SKILL.md")
        self.assertIn("themeable semantic color tokens", content)
        self.assertIn("hardcoded product colors", content)

    def test_skill_flags_semantic_string_literals_for_centralization(self) -> None:
        content = " ".join(_read(SOURCE / "SKILL.md").split())   # a rule wrapped across lines is still the rule
        self.assertIn("semantic string literals", content)
        self.assertIn("shared constants, resource keys, typed wrappers, or configuration inputs", content)

    def test_readme_places_the_review_at_the_start_of_each_task(self) -> None:
        content = " ".join(_read(SOURCE / "README.md").split())
        self.assertIn("beginning of each task workflow", content)
        self.assertIn("before coding starts", content)


if __name__ == "__main__":
    unittest.main()
