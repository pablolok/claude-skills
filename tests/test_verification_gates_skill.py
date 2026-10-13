"""Tests for the verification-gates skill: published as a plugin, named by its frontmatter, no link into another skill."""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import PublishedSkillChecks  # noqa: E402  pylint: disable=wrong-import-position


class TestVerificationGatesSkill(PublishedSkillChecks, unittest.TestCase):
    SKILL = "verification-gates"

    def test_shared_data_is_verified_on_every_view(self) -> None:
        text = (pathlib.Path(__file__).resolve().parents[1] / "skills" / "verification-gates" / "SKILL.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("A change to shared data or configuration is verified on every view that reads it", text)
        self.assertIn("never on a sample", text)


if __name__ == "__main__":
    unittest.main()
