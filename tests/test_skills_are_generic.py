"""A skill here serves anyone, on any project: no person, no project, and a metadata description that is the skill's
own trigger.

The skills are installed on other people's projects; a rule that names one person or one project reads as that
person's preference there. Changelogs keep the history and are exempt.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import typing
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from published_skill_checks import frontmatter  # noqa: E402  pylint: disable=wrong-import-position

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCANNED = (ROOT / "skills", ROOT / "published")
INSTALL_CONFIG = ROOT / "install.config.json"

#: People who must not own a rule (lower case: the files are compared case-insensitively).
PEOPLE = ("pablo", "juan", "matteo", "berma")
#: Projects whose names, paths or examples must not appear in a skill.
PROJECTS = ("double-entry-darling", "manga-haven", "inkwave", "deepborn", "tightwallet", "doublebook")
#: Phrases that make a rule one person's preference.
PHRASES = ("this user",)
#: The repository's own coordinates: they carry the owner's handle and are allowed.
ALLOWED = ("pablolok/claude-skills", "pablolok-skills")
#: The longest plugin description claude.ai accepts (build_marketplace.MAX_DESCRIPTION).
MAX_DESCRIPTION = 500


def _skill_files() -> typing.Iterator[pathlib.Path]:
    for folder in SCANNED:
        for path in sorted(folder.rglob("*")):
            if path.is_file() and path.name != "CHANGELOG.md" and "node_modules" not in path.parts:
                yield path


def _forbidden_in(text: str) -> typing.List[str]:
    lowered = text.lower()
    for allowed in ALLOWED:
        lowered = lowered.replace(allowed, "")
    return [word for word in PEOPLE + PROJECTS + PHRASES if word in lowered]


class TestSkillsAreGeneric(unittest.TestCase):
    def test_the_scan_sees_the_skills(self) -> None:
        # Control: an empty scan would pass every check below.
        names = {path.name for path in _skill_files()}
        self.assertIn("SKILL.md", names)
        self.assertGreater(sum(1 for _ in _skill_files()), 50)

    def test_the_check_catches_a_name_but_not_the_repository(self) -> None:
        self.assertEqual(_forbidden_in("As Pablo wants it, for this user, in Deepborn"), ["pablo", "deepborn", "this user"])
        self.assertEqual(_forbidden_in("claude plugin install x@pablolok-skills from pablolok/claude-skills"), [])
        self.assertEqual(_forbidden_in("github.com/pablolok"), ["pablo"], "the bare handle is still a person")

    def test_no_skill_names_a_person_a_project_or_this_user(self) -> None:
        offenders = [
            f"{path.relative_to(ROOT).as_posix()}: {', '.join(found)}"
            for path in _skill_files()
            for found in [_forbidden_in(path.read_text(encoding="utf-8", errors="ignore"))]
            if found
        ]
        self.assertEqual(offenders, [], "state the rule in general terms: no person, no project")

    def test_every_published_skill_describes_itself_with_its_own_trigger(self) -> None:
        skills = json.loads(INSTALL_CONFIG.read_text(encoding="utf-8"))["skills"]
        self.assertTrue(skills, "control: install.config.json lists the published skills")
        for name in skills:
            with self.subTest(skill=name):
                folder = ROOT / "skills" / name
                description = frontmatter((folder / "SKILL.md").read_text(encoding="utf-8")).get("description", "")
                metadata = json.loads((folder / "metadata.json").read_text(encoding="utf-8"))
                self.assertEqual(metadata["description"], description, "metadata.json repeats the frontmatter")
                self.assertLessEqual(len(description), MAX_DESCRIPTION)
                self.assertNotRegex(description, r"^[|>]", "a one-line description: the marketplace reads it as is")


if __name__ == "__main__":
    unittest.main()
