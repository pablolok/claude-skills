"""Checks every skill published as a plugin must pass, shared by the per-skill test files.

A plugin holds one skill alone in its root, so a relative link into another skill's folder breaks once installed:
the skill names the other skill instead.
"""

from __future__ import annotations

import json
import pathlib
import re
import typing

REPO = pathlib.Path(__file__).resolve().parents[1]
INSTALL_CONFIG = REPO / "install.config.json"

#: A relative link that climbs out of the skill's own folder, e.g. ``](../other-skill/SKILL.md)``.
RELATIVE_SKILL_LINK = re.compile(r"\]\(\.\./")


def frontmatter(text: str) -> typing.Dict[str, str]:
    """The ``key: value`` lines between the opening ``---`` fences of a SKILL.md."""
    match = re.match(r"^---\r?\n(.*?)\r?\n---", text, re.S)
    if match is None:
        return {}
    fields = (line.split(":", 1) for line in match.group(1).splitlines() if ":" in line)
    return {key.strip(): value.strip() for key, value in fields}


class PublishedSkillChecks:
    """Mixin for a ``unittest.TestCase``: set ``SKILL`` to the skill's folder name."""

    SKILL: str = ""

    # Provided by unittest.TestCase.
    assertEqual: typing.Callable[..., None]
    assertTrue: typing.Callable[..., None]
    assertIn: typing.Callable[..., None]

    def _source(self) -> pathlib.Path:
        return REPO / "skills" / self.SKILL

    def _published(self) -> pathlib.Path:
        skills = json.loads(INSTALL_CONFIG.read_text(encoding="utf-8"))["skills"]
        self.assertIn(self.SKILL, skills, "register the skill in install.config.json")
        return REPO / "published" / skills[self.SKILL]["category"] / self.SKILL

    def test_the_published_skill_is_the_source(self) -> None:
        published = self._published() / "SKILL.md"
        self.assertTrue(published.is_file(), f"publish it: {published.relative_to(REPO).as_posix()} is missing")
        source = (self._source() / "SKILL.md").read_text(encoding="utf-8")
        self.assertEqual(published.read_text(encoding="utf-8"), source, "publish the skill")

    def test_the_frontmatter_names_the_skill_and_feeds_the_metadata(self) -> None:
        fields = frontmatter((self._published() / "SKILL.md").read_text(encoding="utf-8"))
        self.assertEqual(fields.get("name"), self.SKILL)
        metadata = json.loads((self._published() / "metadata.json").read_text(encoding="utf-8"))
        self.assertEqual((metadata["name"], metadata["description"]), (self.SKILL, fields.get("description")))

    def test_no_relative_link_into_another_skill(self) -> None:
        offenders = [
            path.relative_to(REPO).as_posix()
            for path in sorted(self._published().rglob("*.md"))
            if RELATIVE_SKILL_LINK.search(path.read_text(encoding="utf-8"))
        ]
        self.assertEqual(offenders, [], "name the other skill instead of linking to its folder")
