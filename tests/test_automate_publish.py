"""Tests for automate_publish.py: a publish moves a mod's own manifest version along with metadata.json."""

from __future__ import annotations

import json
import pathlib
import shutil
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

import automate_publish  # noqa: E402  pylint: disable=wrong-import-position


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


if __name__ == "__main__":
    unittest.main()
