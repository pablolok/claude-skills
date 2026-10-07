"""Tests for the clean-code-standards skill: published as a plugin, named by its frontmatter, no link into another skill."""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import PublishedSkillChecks  # noqa: E402  pylint: disable=wrong-import-position


class TestCleanCodeStandardsSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = "clean-code-standards"


if __name__ == "__main__":
    unittest.main()
