"""Tests for the typescript-react-standards skill: published as a plugin, named by its frontmatter, no link into
another skill."""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import PublishedSkillChecks  # noqa: E402  pylint: disable=wrong-import-position


class TestTypescriptReactStandardsSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = "typescript-react-standards"


if __name__ == "__main__":
    unittest.main()
