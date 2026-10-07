"""Tests for Angular audit skill registration."""

from __future__ import annotations

import os
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from install import SkillInstaller


class TestFrontendAuditSkills(unittest.TestCase):
    def setUp(self) -> None:
        self.installer = SkillInstaller("published", lambda _config: {})

    def test_angular_audit_is_listed_in_published_audit_skills(self) -> None:
        available = self.installer.get_available_skills()
        self.assertIn("audit", available)
        self.assertIn("compliance-audit-angular", available["audit"])

    def test_orchestrator_mentions_angular_audit(self) -> None:
        path = os.path.join("skills", "compliance-audit-orchestrator", "SKILL.md")
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("Angular Audit", content)
        self.assertIn("compliance-audit-angular", content)
        self.assertIn("Frontend Styling Audit", content)
        self.assertIn("compliance-audit-frontend-styling", content)

    def test_frontend_styling_audit_source_exists(self) -> None:
        skill_path = os.path.join("skills", "compliance-audit-frontend-styling", "SKILL.md")

        with open(skill_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn("Reusable Styling Primitives", content)
        self.assertIn("Design Tokens", content)
        self.assertIn("Themeable Colors", content)
        self.assertIn("Treat hardcoded product colors", content)
        self.assertIn("Framework-Agnostic Practicality", content)

    def test_audit_skills_are_read_only_for_skill_infrastructure(self) -> None:
        angular_path = os.path.join("skills", "compliance-audit-angular", "SKILL.md")
        orchestrator_path = os.path.join("skills", "compliance-audit-orchestrator", "SKILL.md")

        with open(angular_path, "r", encoding="utf-8") as handle:
            angular_content = handle.read()
        with open(orchestrator_path, "r", encoding="utf-8") as handle:
            orchestrator_content = handle.read()

        self.assertIn("read-only with respect to skill infrastructure", angular_content)
        self.assertIn("read-only with respect to skill infrastructure", orchestrator_content)

    def test_angular_audit_requires_reusable_component_extraction(self) -> None:
        angular_path = os.path.join("skills", "compliance-audit-angular", "SKILL.md")

        with open(angular_path, "r", encoding="utf-8") as handle:
            angular_content = handle.read()

        self.assertIn("Reusability Audit", angular_content)
        self.assertIn("same widget being implemented more than once", angular_content)
        self.assertIn("generic reusable component API", angular_content)

    def test_frontend_audits_prefer_enums_over_numeric_codes(self) -> None:
        angular_path = os.path.join("skills", "compliance-audit-angular", "SKILL.md")
        avalonia_path = os.path.join("skills", "compliance-audit-avalonia", "SKILL.md")
        csharp_path = os.path.join("skills", "compliance-audit-csharp", "SKILL.md")

        with open(angular_path, "r", encoding="utf-8") as handle:
            angular_content = handle.read()
        with open(avalonia_path, "r", encoding="utf-8") as handle:
            avalonia_content = handle.read()
        with open(csharp_path, "r", encoding="utf-8") as handle:
            csharp_content = handle.read()

        self.assertIn("Domain Modeling Clarity", angular_content)
        self.assertIn("Prefer enums or other strongly typed named abstractions", angular_content)
        self.assertIn("Domain Modeling Clarity", avalonia_content)
        self.assertIn("Prefer enums or other strongly typed named abstractions", avalonia_content)
        self.assertIn("Domain Modeling Clarity", csharp_content)
        self.assertIn("Prefer enums or other strongly typed named abstractions", csharp_content)

    def test_audit_skills_discourage_semantic_hardcoded_strings(self) -> None:
        angular_path = os.path.join("skills", "compliance-audit-angular", "SKILL.md")
        avalonia_path = os.path.join("skills", "compliance-audit-avalonia", "SKILL.md")
        csharp_path = os.path.join("skills", "compliance-audit-csharp", "SKILL.md")
        scripts_path = os.path.join("skills", "compliance-audit-scripts", "SKILL.md")
        styling_path = os.path.join("skills", "compliance-audit-frontend-styling", "SKILL.md")

        for path in [angular_path, avalonia_path, csharp_path, scripts_path, styling_path]:
            with open(path, "r", encoding="utf-8") as handle:
                content = handle.read()

            self.assertIn("String Literal Centralization", content)
            self.assertIn("hardcoded string literals", content)

    def test_avalonia_audit_requires_reusable_control_extraction(self) -> None:
        avalonia_path = os.path.join("skills", "compliance-audit-avalonia", "SKILL.md")

        with open(avalonia_path, "r", encoding="utf-8") as handle:
            avalonia_content = handle.read()

        self.assertIn("Reusability Audit", avalonia_content)
        self.assertIn("implemented more than once across views", avalonia_content)
        self.assertIn("generic reusable control API", avalonia_content)

    def test_csharp_audit_requires_reusable_abstractions(self) -> None:
        csharp_path = os.path.join("skills", "compliance-audit-csharp", "SKILL.md")

        with open(csharp_path, "r", encoding="utf-8") as handle:
            csharp_content = handle.read()

        self.assertIn("Reusability Audit", csharp_content)
        self.assertIn("implemented more than once across services", csharp_content)
        self.assertIn("generic reusable abstraction", csharp_content)

    def test_csharp_audit_blocks_warning_suppression_shortcuts(self) -> None:
        csharp_path = os.path.join("skills", "compliance-audit-csharp", "SKILL.md")

        with open(csharp_path, "r", encoding="utf-8") as handle:
            csharp_content = handle.read()

        self.assertIn("Warning Suppression Policy", csharp_content)
        self.assertIn("`#pragma warning disable`", csharp_content)
        self.assertIn("`NoWarn`", csharp_content)
        self.assertIn("[SuppressMessage]", csharp_content)
        self.assertIn("Generated Entity Framework migration files under `Migrations/`", csharp_content)
