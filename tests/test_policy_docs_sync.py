"""Tests for the root policy documents and the names the skills may still tell an agent."""

from __future__ import annotations

import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class TestPolicyDocs(unittest.TestCase):
    def test_legacy_policy_docs_are_removed(self) -> None:
        # Exact names from the listing: on a case-insensitive filesystem (Windows, macOS) `claude.md` "exists"
        # because CLAUDE.md does.
        names = {entry.name for entry in ROOT.iterdir()}
        self.assertNotIn("gemini.md", names)
        self.assertNotIn("claude.md", names)
        self.assertNotIn("AGENTS.md", names)
        self.assertIn("CLAUDE.md", names, "control: the listing does see the policy doc")

    def test_no_skill_tells_the_agent_a_retired_skill_name(self) -> None:
        # Installed skills carry the new name only: an instruction naming the old one finds nothing to invoke
        # (the orchestrator never ran the C# audit that way). Changelogs keep the history.
        retired = "compliance-audit-c#"
        offenders = [
            path.relative_to(ROOT).as_posix()
            for folder in ("skills", "published")
            for path in (ROOT / folder).rglob("*.md")
            if path.is_file() and path.name != "CHANGELOG.md"
            and retired in path.read_text(encoding="utf-8", errors="ignore")
        ]
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
