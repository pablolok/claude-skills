"""Tests for antigravity_manifest.py and the Antigravity half of `build_marketplace.py --check`, in temporary repos."""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import shutil
import sys
import tempfile
import unittest
from unittest import mock

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

import antigravity_manifest  # noqa: E402  pylint: disable=wrong-import-position
import build_marketplace  # noqa: E402  pylint: disable=wrong-import-position

MANIFEST = antigravity_manifest.MANIFEST


def _write(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _agent(model: str | None) -> str:
    line = f"model: {model}\n" if model is not None else ""
    return f"---\nname: worker\ndescription: does x\n{line}---\n\nBody.\n"


class _TempRepo(unittest.TestCase):
    """A repository with a root skill, a skill with Claude agents, a bundle and a mod with no skill, all published."""

    def setUp(self) -> None:
        self.root = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)
        self.tree = self.root / antigravity_manifest.TREE
        self.alpha = self._plugin("workflow", "alpha")
        _write(self.alpha / "SKILL.md", "---\nname: alpha\ndescription: x\n---\n")
        self.flow = self._plugin("workflow", "flow")
        _write(self.flow / "SKILL.md", "---\nname: flow\ndescription: x\n---\n")
        _write(self.flow / "agents" / "flow-heavy.md", _agent("opus"))
        _write(self.flow / "references" / "notes.md", "# Notes\n")
        self.bundle = self._plugin("gamedev", "kit", kind="bundle")
        _write(self.bundle / "skills" / "rig" / "SKILL.md", "---\nname: rig\ndescription: x\n---\n")
        self.mod = self._plugin("workflow", "panel")
        _write(self.mod / "plugin-entry.json", json.dumps({"strict": True}))
        _write(self.mod / antigravity_manifest.CLAUDE_MANIFEST, json.dumps({
            "name": "panel", "author": {"name": "someone"}, "license": "MIT", "keywords": ["progress"],
        }))
        _write(self.root / build_marketplace.INSTALL_CONFIG, json.dumps({"schemaVersion": 2, "skills": {
            "alpha": {"category": "workflow"},
            "flow": {"category": "workflow"},
            "kit": {"category": "gamedev", "kind": "bundle"},
            "panel": {"category": "workflow", "skill": False},
        }}))

    def _plugin(self, category: str, name: str, kind: str | None = None) -> pathlib.Path:
        folder = self.root / "published" / category / name
        metadata = {"name": name, "version": "1.2.3", "description": f"{name} does x"}
        if kind is not None:
            metadata["kind"] = kind
        _write(folder / "metadata.json", json.dumps(metadata))
        _write(folder / "README.md", f"# {name}\n")
        return folder

    def _publish_all(self) -> None:
        for folder in (self.alpha, self.flow, self.bundle, self.mod):
            antigravity_manifest.publish(folder, folder.parent.name, self.tree)

    def _manifest(self, folder: pathlib.Path) -> dict:
        return json.loads((folder / MANIFEST).read_text(encoding="utf-8"))

    def _check(self) -> tuple[int, str]:
        (self.root / build_marketplace.MARKETPLACE).parent.mkdir(parents=True, exist_ok=True)
        (self.root / build_marketplace.MARKETPLACE).write_text(
            build_marketplace.render(build_marketplace.build(self.root)), encoding="utf-8")
        errors = io.StringIO()
        with mock.patch.object(build_marketplace, "REPO", self.root), contextlib.redirect_stderr(errors), \
                contextlib.redirect_stdout(io.StringIO()):
            code = build_marketplace.main(["--check"])
        return code, errors.getvalue()


class TestManifestFields(_TempRepo):
    def test_the_fields_come_from_the_marketplace_data_and_the_version_is_the_metadata_one(self) -> None:
        self._publish_all()
        self.assertEqual(self._manifest(self.alpha), {
            "$schema": antigravity_manifest.SCHEMA,
            "name": "alpha",
            "displayName": "Alpha",
            "version": "1.2.3",
            "description": "alpha does x",
            "homepage": antigravity_manifest.REPOSITORY,
            "repository": antigravity_manifest.REPOSITORY,
            "category": "workflow",
            "skills": ["./"],
        })
        self.assertEqual(antigravity_manifest.display_name("savvy-flow"), "Savvy Flow")

    def test_no_manifest_names_an_author_even_when_the_claude_manifest_does(self) -> None:
        self._publish_all()
        for folder in (self.alpha, self.tree / "workflow" / "flow", self.bundle, self.mod):
            with self.subTest(plugin=folder.name):
                self.assertNotIn("author", self._manifest(folder))

    def test_a_mod_carries_the_license_and_keywords_its_claude_manifest_declares(self) -> None:
        self._publish_all()
        manifest = self._manifest(self.mod)
        self.assertEqual((manifest["license"], manifest["keywords"]), ("MIT", ["progress"]))
        self.assertNotIn("license", self._manifest(self.alpha))
        self.assertNotIn("keywords", self._manifest(self.alpha))

    def test_only_a_plugin_whose_skill_is_its_folder_lists_skills(self) -> None:
        self._publish_all()
        self.assertEqual(self._manifest(self.alpha)["skills"], ["./"])
        self.assertEqual(self._manifest(self.tree / "workflow" / "flow")["skills"], ["./"])
        self.assertNotIn("skills", self._manifest(self.bundle), "a bundle's nested skills are found without it")
        self.assertNotIn("skills", self._manifest(self.mod), "a mod with no skill has none to list")

    def test_the_text_is_stable_json_with_a_final_newline(self) -> None:
        self._publish_all()
        text = (self.alpha / MANIFEST).read_text(encoding="utf-8")
        self.assertEqual(text, antigravity_manifest.render(json.loads(text)))
        self.assertTrue(text.endswith("}\n"))
        self.assertNotIn("\r", text)


class TestClaudeAgents(_TempRepo):
    def test_an_agent_on_a_model_antigravity_does_not_run_is_a_claude_agent(self) -> None:
        agents = self.alpha / "agents"
        for model in ("flash", "pro", "inherit", "flash_lite", "'flash'"):
            with self.subTest(model=model):
                _write(agents / "a.md", _agent(model))
                self.assertFalse(antigravity_manifest.has_claude_agents(self.alpha))
        for model in ("opus", "sonnet", "fable", "haiku", None):
            with self.subTest(model=model):
                _write(agents / "a.md", _agent(model))
                self.assertTrue(antigravity_manifest.has_claude_agents(self.alpha))

    def test_no_agents_folder_is_no_claude_agent(self) -> None:
        self.assertFalse(antigravity_manifest.has_claude_agents(self.alpha))
        self.assertFalse(antigravity_manifest.has_claude_agents(self.bundle))

    def test_a_plugin_with_claude_agents_gets_a_separate_copy_without_them(self) -> None:
        self._publish_all()
        copy = self.tree / "workflow" / "flow"
        self.assertFalse((self.flow / MANIFEST).exists(), "the Claude copy stays as Claude Code loads it")
        self.assertTrue((self.flow / "agents" / "flow-heavy.md").is_file())
        self.assertFalse((copy / "agents").exists())
        self.assertEqual((copy / "SKILL.md").read_bytes(), (self.flow / "SKILL.md").read_bytes())
        notes = pathlib.Path("references") / "notes.md"
        self.assertEqual((copy / notes).read_bytes(), (self.flow / notes).read_bytes())
        self.assertEqual(self._manifest(copy)["name"], "flow")
        self.assertEqual(copy.name, self.flow.name, "Antigravity keys a plugin's enablement by its folder name")
        self.assertEqual(sorted(path.name for path in self.tree.glob("*/*")), ["flow"],
                         "only a plugin with Claude agents gets a copy")

    def test_a_nested_agents_folder_is_copied(self) -> None:
        _write(self.flow / "references" / "agents" / "example.md", "# Example\n")
        self._publish_all()
        self.assertTrue((self.tree / "workflow" / "flow" / "references" / "agents" / "example.md").is_file())

    def test_a_copy_left_from_a_release_with_claude_agents_is_removed(self) -> None:
        self._publish_all()
        shutil.rmtree(self.flow / "agents")
        self.assertEqual(antigravity_manifest.publish(self.flow, "workflow", self.tree), self.flow)
        self.assertFalse((self.tree / "workflow" / "flow").exists())
        self.assertEqual(self._manifest(self.flow)["name"], "flow")


class TestCheck(_TempRepo):
    def test_the_check_passes_once_every_plugin_is_published(self) -> None:
        self._publish_all()
        self.assertEqual(self._check(), (0, ""))

    def test_a_missing_manifest_fails_the_check(self) -> None:
        self._publish_all()
        (self.alpha / MANIFEST).unlink()
        code, errors = self._check()
        self.assertEqual(code, 1)
        self.assertIn("published/workflow/alpha/.antigravity-plugin/plugin.json is missing", errors)

    def test_a_stale_manifest_fails_the_check(self) -> None:
        self._publish_all()
        metadata = json.loads((self.bundle / "metadata.json").read_text(encoding="utf-8"))
        metadata["version"] = "1.2.4"
        (self.bundle / "metadata.json").write_text(json.dumps(metadata), encoding="utf-8")
        code, errors = self._check()
        self.assertEqual(code, 1)
        self.assertIn("published/gamedev/kit/.antigravity-plugin/plugin.json is out of date", errors)

    def test_a_missing_or_stale_copy_fails_the_check(self) -> None:
        self._publish_all()
        copy = self.tree / "workflow" / "flow"
        (copy / "references" / "notes.md").write_text("# Older notes\n", encoding="utf-8")
        code, errors = self._check()
        self.assertEqual(code, 1)
        self.assertIn("published-antigravity/workflow/flow differs from published/workflow/flow", errors)
        shutil.rmtree(copy)
        code, errors = self._check()
        self.assertEqual(code, 1)
        self.assertIn("published-antigravity/workflow/flow/.antigravity-plugin/plugin.json is missing", errors)

    def test_a_manifest_in_the_claude_copy_of_a_plugin_with_claude_agents_fails_the_check(self) -> None:
        self._publish_all()
        shutil.copytree(self.tree / "workflow" / "flow" / MANIFEST.parent, self.flow / MANIFEST.parent)
        code, errors = self._check()
        self.assertEqual(code, 1)
        self.assertIn("published/workflow/flow/.antigravity-plugin/plugin.json must not exist", errors)

    def test_an_orphan_copy_fails_the_check(self) -> None:
        self._publish_all()
        shutil.copytree(self.alpha, self.tree / "workflow" / "alpha")
        code, errors = self._check()
        self.assertEqual(code, 1)
        self.assertIn("published-antigravity/workflow/alpha has no published plugin with Claude agents", errors)

    def test_a_plugin_left_out_of_the_marketplace_needs_no_manifest(self) -> None:
        self._publish_all()
        config = json.loads((self.root / build_marketplace.INSTALL_CONFIG).read_text(encoding="utf-8"))
        config["skills"]["tool"] = {"category": "workflow", "plugin": False}
        (self.root / build_marketplace.INSTALL_CONFIG).write_text(json.dumps(config), encoding="utf-8")
        tool = self._plugin("workflow", "tool")
        _write(tool / "SKILL.md", "---\nname: tool\ndescription: x\n---\n")
        self.assertEqual(self._check(), (0, ""))


if __name__ == "__main__":
    unittest.main()
