"""Tests for synchronized root policy documents."""

from __future__ import annotations

import pathlib
import unittest


class TestPolicyDocsSync(unittest.TestCase):
    def test_agents_and_claude_docs_are_identical(self) -> None:
        root = pathlib.Path(__file__).resolve().parents[1]
        agents = (root / "AGENTS.md").read_text(encoding="utf-8")
        claude = (root / "CLAUDE.md").read_text(encoding="utf-8")

        self.assertEqual(agents, claude)

    def test_legacy_policy_docs_are_removed(self) -> None:
        root = pathlib.Path(__file__).resolve().parents[1]
        # Exact names from the listing: on a case-insensitive filesystem (Windows, macOS) `claude.md` "exists"
        # because CLAUDE.md does.
        names = {entry.name for entry in root.iterdir()}
        self.assertNotIn("gemini.md", names)
        self.assertNotIn("claude.md", names)
        self.assertIn("CLAUDE.md", names, "control: the listing does see the policy doc")

    def test_no_skill_tells_the_agent_a_retired_skill_name(self) -> None:
        # Installed skills carry the new name only: an instruction naming the old one finds nothing to invoke
        # (the orchestrator never ran the C# audit that way). Changelogs keep the history.
        root = pathlib.Path(__file__).resolve().parents[1]
        retired = "compliance-audit-c#"
        offenders = [
            path.relative_to(root).as_posix()
            for folder in ("skills", "published")
            for path in (root / folder).rglob("*.md")
            if path.is_file() and path.name != "CHANGELOG.md"
            and retired in path.read_text(encoding="utf-8", errors="ignore")
        ]
        self.assertEqual(offenders, [])
