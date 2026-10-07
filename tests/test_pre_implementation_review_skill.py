"""Tests for the pre-implementation review skill."""

from __future__ import annotations

import os
import pathlib
import sys
import tempfile
import unittest
import importlib.util

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from install import SkillInstaller


class TestPreImplementationReviewSkill(unittest.TestCase):
    def setUp(self) -> None:
        self.installer = SkillInstaller("published", lambda _config: {})

    def test_skill_is_listed_in_published_workflow_skills(self) -> None:
        available = self.installer.get_available_skills()
        self.assertIn("workflow", available)
        self.assertIn("pre-implementation-review", available["workflow"])

    def test_source_skill_exists(self) -> None:
        skill_path = os.path.join("skills", "pre-implementation-review", "SKILL.md")
        self.assertTrue(os.path.exists(skill_path))

        with open(skill_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("pre-implementation-review", content)

    def test_skill_recommends_enums_over_raw_numeric_codes(self) -> None:
        skill_path = os.path.join("skills", "pre-implementation-review", "SKILL.md")

        with open(skill_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("numeric state/category/status codes", content)
        self.assertIn("Prefer enums or typed named constants over raw numeric codes", content)

    def test_skill_recommends_shared_frontend_styling_primitives(self) -> None:
        skill_path = os.path.join("skills", "pre-implementation-review", "SKILL.md")

        with open(skill_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("repeated component-local CSS or SCSS", content)
        self.assertIn("Prefer shared styling primitives, design tokens, or utility layers", content)

    def test_skill_recommends_themeable_color_tokens(self) -> None:
        skill_path = os.path.join("skills", "pre-implementation-review", "SKILL.md")

        with open(skill_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("themeable semantic color tokens", content)
        self.assertIn("hardcoded product colors", content)

    def test_skill_flags_semantic_string_literals_for_centralization(self) -> None:
        skill_path = os.path.join("skills", "pre-implementation-review", "SKILL.md")

        with open(skill_path, "r", encoding="utf-8") as handle:
            content = " ".join(handle.read().split())   # a rule wrapped across lines is still the rule

        self.assertIn("semantic string literals", content)
        self.assertIn("shared constants, resource keys, typed wrappers, or configuration inputs", content)

    def test_readme_describes_conductor_workflow_integration(self) -> None:
        readme_path = os.path.join("skills", "pre-implementation-review", "README.md")

        with open(readme_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("beginning of each task workflow", content)
        self.assertIn("update the current phase tasks in `plan.md` before coding starts", content)
        self.assertIn("post_install.py", content)


def _load_module(module_name: str, path: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


POST_INSTALL = _load_module(
    "pre_implementation_review_post_install",
    os.path.join("skills", "pre-implementation-review", "post_install.py"),
)


class TestPreImplementationReviewPostInstall(unittest.TestCase):
    def test_integrate_into_workflow_inserts_step_once(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workflow_dir = os.path.join(temp_dir, "conductor")
            os.makedirs(workflow_dir, exist_ok=True)
            workflow_path = os.path.join(workflow_dir, "workflow.md")
            with open(workflow_path, "w", encoding="utf-8") as handle:
                handle.write(
                    "1. **Select Task:**\n"
                    "2. **Mark In Progress:**\n"
                    "3. **Write Failing Tests (Red Phase):**\n"
                    "4. **Implement to Pass Tests (Green Phase):**\n"
                    "5. **Refactor (Optional but Recommended):**\n"
                    "6. **Verify Coverage:**\n"
                    "7. **Document Deviations:**\n"
                    "8. **Commit Code Changes:**\n"
                    "9. **Attach Task Summary with Git Notes:**\n"
                    "10. **Get and Record Task Commit SHA:**\n"
                    "11. **Commit Plan Update:**\n"
                )

            POST_INSTALL.integrate_into_workflow(temp_dir)
            POST_INSTALL.integrate_into_workflow(temp_dir)

            with open(workflow_path, "r", encoding="utf-8") as handle:
                content = handle.read()

            self.assertIn("3. **Run Pre-Implementation Review:**", content)
            self.assertIn("pre-implementation-review", content)
            self.assertEqual(content.count("3. **Run Pre-Implementation Review:**"), 1)
            self.assertIn("4. **Write Failing Tests (Red Phase):**", content)
            self.assertIn("12. **Commit Plan Update:**", content)
