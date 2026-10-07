"""Tests for the root policy documents and the names the skills may still tell an agent."""

from __future__ import annotations

import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

#: Skills and tools removed from this repository (lower case: the docs are compared case-insensitively).
RETIRED = (
    "compliance-audit",
    "review-optimization",
    "conductor",
    "subagent-balancer",
    "skill-manager",
    "changelog-manager",
    "install.py",
    "post_install",
)


class TestPolicyDocs(unittest.TestCase):
    def test_legacy_policy_docs_are_removed(self) -> None:
        # Exact names from the listing: on a case-insensitive filesystem (Windows, macOS) `claude.md` "exists"
        # because CLAUDE.md does.
        names = {entry.name for entry in ROOT.iterdir()}
        self.assertNotIn("gemini.md", names)
        self.assertNotIn("claude.md", names)
        self.assertNotIn("AGENTS.md", names)
        self.assertIn("CLAUDE.md", names, "control: the listing does see the policy doc")

    def test_no_skill_or_root_doc_names_a_retired_skill_or_tool(self) -> None:
        # An instruction naming a removed skill or the removed installer finds nothing to invoke.
        # Changelogs keep the history.
        docs = [ROOT / "CLAUDE.md", ROOT / "README.md"] + [
            path for folder in ("skills", "published") for path in (ROOT / folder).rglob("*.md")
        ]
        offenders = [
            f"{path.relative_to(ROOT).as_posix()}: {name}"
            for path in docs
            if path.is_file() and path.name != "CHANGELOG.md"
            for name in RETIRED
            if name in path.read_text(encoding="utf-8", errors="ignore").lower()
        ]
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
