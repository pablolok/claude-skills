"""Tests for the csharp-oop-standards skill: published as a plugin, named by its frontmatter, no link into another skill."""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import PublishedSkillChecks  # noqa: E402  pylint: disable=wrong-import-position


class TestCsharpOopStandardsSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = "csharp-oop-standards"


if __name__ == "__main__":
    unittest.main()
