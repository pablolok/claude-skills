"""Tests for automate_publish.py: a publish moves a mod's own manifest version along with metadata.json, and writes the
Antigravity manifest (or the Antigravity copy of a plugin with Claude agents) at the published version."""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import shutil
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

import antigravity_manifest  # noqa: E402  pylint: disable=wrong-import-position
import automate_publish  # noqa: E402  pylint: disable=wrong-import-position
import build_marketplace  # noqa: E402  pylint: disable=wrong-import-position


class TestSyncManifestVersion(unittest.TestCase):
    """Claude Code takes the manifest's version over the marketplace entry's: the publish keeps the two equal."""

    def setUp(self) -> None:
        self.skill = pathlib.Path(tempfile.mkdtemp())

    def tearDown(self) -> None:
        shutil.rmtree(self.skill)

    def _manifest(self, data: dict) -> pathlib.Path:
        path = self.skill / automate_publish.PLUGIN_MANIFEST
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        return path

    def test_a_declared_version_follows_the_publish_and_the_rest_stays(self) -> None:
        path = self._manifest({"name": "alpha", "version": "1.2.0", "userConfig": {"x": {"type": "string"}}})
        self.assertTrue(automate_publish.sync_manifest_version(self.skill, "1.2.1"))
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")),
                         {"name": "alpha", "version": "1.2.1", "userConfig": {"x": {"type": "string"}}})

    def test_a_manifest_already_at_the_version_is_left_byte_for_byte(self) -> None:
        path = self._manifest({"name": "alpha", "version": "1.2.0"})
        path.write_text('{ "name": "alpha", "version": "1.2.0" }', encoding="utf-8")
        self.assertFalse(automate_publish.sync_manifest_version(self.skill, "1.2.0"))
        self.assertEqual(path.read_text(encoding="utf-8"), '{ "name": "alpha", "version": "1.2.0" }')

    def test_no_manifest_or_no_declared_version_is_left_alone(self) -> None:
        self.assertFalse(automate_publish.sync_manifest_version(self.skill, "1.0.0"))
        path = self._manifest({"name": "alpha"})
        self.assertFalse(automate_publish.sync_manifest_version(self.skill, "1.0.0"))
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"name": "alpha"})


class TestPublishWritesTheAntigravityManifest(unittest.TestCase):
    """The publish writes the Antigravity manifest after the copy, never from the source."""

    def setUp(self) -> None:
        self.root = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)

    def _source(self, name: str, agents_model: str | None = None) -> pathlib.Path:
        folder = self.root / "skills" / name
        folder.mkdir(parents=True)
        (folder / "SKILL.md").write_text(f"---\nname: {name}\ndescription: x\n---\n", encoding="utf-8")
        (folder / "metadata.json").write_text(
            json.dumps({"name": name, "version": "1.0.0", "description": f"{name} does x"}), encoding="utf-8")
        if agents_model is not None:
            (folder / "agents").mkdir()
            (folder / "agents" / "worker.md").write_text(
                f"---\nname: worker\ndescription: x\nmodel: {agents_model}\n---\n", encoding="utf-8")
        return folder

    def _publish(self, name: str) -> None:
        with contextlib.redirect_stdout(io.StringIO()):
            automate_publish.publish_skill(name, "workflow", "Change", "minor", skills_dir=str(self.root / "skills"),
                                           published_dir=str(self.root / "published"))

    def _manifest(self, folder: pathlib.Path) -> dict:
        return json.loads((folder / antigravity_manifest.MANIFEST).read_text(encoding="utf-8"))

    def test_the_published_folder_gets_the_manifest_at_the_new_version(self) -> None:
        source = self._source("alpha")
        self._publish("alpha")
        published = self.root / "published" / "workflow" / "alpha"
        self.assertEqual(self._manifest(published)["version"], "1.1.0")
        self.assertFalse((source / antigravity_manifest.MANIFEST).exists(), "generated in published/, not the source")
        self.assertFalse((self.root / antigravity_manifest.TREE).exists())

    def test_a_plugin_with_claude_agents_gets_its_copy_beside_published(self) -> None:
        self._source("flow", agents_model="opus")
        self._publish("flow")
        published = self.root / "published" / "workflow" / "flow"
        copy = self.root / antigravity_manifest.TREE / "workflow" / "flow"
        self.assertTrue((published / "agents" / "worker.md").is_file())
        self.assertFalse((published / antigravity_manifest.MANIFEST.parent).exists())
        self.assertFalse((copy / "agents").exists())
        self.assertEqual(self._manifest(copy)["version"], "1.1.0")

    def test_a_hand_written_manifest_in_the_source_fails_before_the_bump(self) -> None:
        source = self._source("alpha")
        (source / antigravity_manifest.MANIFEST).parent.mkdir()
        (source / antigravity_manifest.MANIFEST).write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "generated by the publish"):
            self._publish("alpha")
        self.assertEqual(json.loads((source / "metadata.json").read_text(encoding="utf-8"))["version"], "1.0.0")
        self.assertFalse((self.root / "published").exists())


    def _overlay_agent(self, source: pathlib.Path, name: str, model: str) -> None:
        path = source / antigravity_manifest.OVERLAY / "agents" / f"{name}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"---\nname: {name}\ndescription: x\nmodel: {model}\n---\n", encoding="utf-8")

    def test_the_overlay_stays_out_of_the_claude_copy_and_becomes_the_antigravity_agents(self) -> None:
        source = self._source("flow", agents_model="opus")
        self._overlay_agent(source, "worker", "flash")
        nested = source / "references" / antigravity_manifest.OVERLAY / "note.md"
        nested.parent.mkdir(parents=True)
        nested.write_text("# Kept\n", encoding="utf-8")
        self._publish("flow")
        published = self.root / "published" / "workflow" / "flow"
        copy = self.root / antigravity_manifest.TREE / "workflow" / "flow"
        self.assertFalse((published / antigravity_manifest.OVERLAY).exists())
        self.assertTrue((published / "references" / antigravity_manifest.OVERLAY / "note.md").is_file(),
                        "only the overlay at the source root is left out")
        self.assertIn("model: opus", (published / "agents" / "worker.md").read_text(encoding="utf-8"))
        self.assertIn("model: flash", (copy / "agents" / "worker.md").read_text(encoding="utf-8"))
        self.assertFalse((copy / antigravity_manifest.OVERLAY).exists())
        self.assertEqual(self._manifest(copy)["version"], "1.1.0")

    def test_an_overlay_agent_on_a_claude_model_fails_before_the_bump(self) -> None:
        source = self._source("flow", agents_model="opus")
        self._overlay_agent(source, "worker", "sonnet")
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "must declare a model Antigravity runs"):
            self._publish("flow")
        self.assertEqual(json.loads((source / "metadata.json").read_text(encoding="utf-8"))["version"], "1.0.0")
        self.assertFalse((self.root / "published").exists())


if __name__ == "__main__":
    unittest.main()
