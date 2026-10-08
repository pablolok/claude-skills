"""Tests for build_marketplace.py: the plugin marketplace derived from the published skills."""

from __future__ import annotations

import json
import pathlib
import shutil
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

import build_marketplace  # noqa: E402  pylint: disable=wrong-import-position


def _skill(root: pathlib.Path, category: str, name: str, extra: dict | None = None) -> None:
    folder = root / "published" / category / name
    folder.mkdir(parents=True)
    (folder / "SKILL.md").write_text(f"---\nname: {name}\ndescription: x\n---\n", encoding="utf-8")
    (folder / "metadata.json").write_text(json.dumps({"name": name, "version": "1.2.3", "description": f"{name} does x"}), encoding="utf-8")
    if extra is not None:
        (folder / build_marketplace.PLUGIN_ENTRY).write_text(json.dumps(extra), encoding="utf-8")


class TestBuild(unittest.TestCase):
    def setUp(self) -> None:
        self.root = pathlib.Path(tempfile.mkdtemp())

    def tearDown(self) -> None:
        shutil.rmtree(self.root)

    def _config(self, skills: dict) -> None:
        (self.root / build_marketplace.INSTALL_CONFIG).write_text(json.dumps({"schemaVersion": 2, "skills": skills}), encoding="utf-8")

    def test_one_plugin_per_skill_its_folder_the_plugin(self) -> None:
        _skill(self.root, "workflow", "alpha")
        self._config({"alpha": {"category": "workflow"}})
        [plugin] = build_marketplace.build(self.root)["plugins"]
        self.assertEqual(plugin["source"], "./published/workflow/alpha")
        self.assertEqual(plugin["skills"], ["./"])
        self.assertIs(plugin["strict"], False)
        self.assertEqual((plugin["version"], plugin["description"]), ("1.2.3", "alpha does x"))

    def test_a_skill_that_opts_out_is_left_out_and_the_others_sorted(self) -> None:
        for name in ("zeta", "alpha", "tool"):
            _skill(self.root, "utility", name)
        self._config({"zeta": {"category": "utility"}, "tool": {"category": "utility", "plugin": False},
                      "alpha": {"category": "utility"}})
        self.assertEqual([p["name"] for p in build_marketplace.build(self.root)["plugins"]], ["alpha", "zeta"])

    def test_a_skill_declares_its_own_hooks_and_commands(self) -> None:
        hooks = {"Stop": [{"hooks": [{"type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/x.mjs\""}]}]}
        _skill(self.root, "workflow", "alpha", {"hooks": hooks, "commands": ["./commands"]})
        self._config({"alpha": {"category": "workflow"}})
        [plugin] = build_marketplace.build(self.root)["plugins"]
        self.assertEqual(plugin["hooks"], hooks)
        self.assertEqual(plugin["commands"], ["./commands"])

    def test_a_mod_declares_strict_so_its_own_manifest_is_read(self) -> None:
        _skill(self.root, "workflow", "alpha", {"strict": True})
        self._config({"alpha": {"category": "workflow"}})
        [plugin] = build_marketplace.build(self.root)["plugins"]
        self.assertIs(plugin["strict"], True)
        self.assertEqual(plugin["skills"], ["./"])
        _skill(self.root, "workflow", "beta", {"strict": "yes"})
        self._config({"beta": {"category": "workflow"}})
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "strict"):
            build_marketplace.build(self.root)

    def test_an_unknown_declared_field_fails(self) -> None:
        _skill(self.root, "workflow", "alpha", {"source": "./elsewhere"})
        self._config({"alpha": {"category": "workflow"}})
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "unknown field"):
            build_marketplace.build(self.root)

    def test_a_description_over_the_limit_fails(self) -> None:
        _skill(self.root, "workflow", "alpha")
        metadata = self.root / "published" / "workflow" / "alpha" / "metadata.json"
        long_text = "x" * (build_marketplace.MAX_DESCRIPTION + 1)
        metadata.write_text(json.dumps({"name": "alpha", "version": "1.2.3", "description": long_text}), encoding="utf-8")
        self._config({"alpha": {"category": "workflow"}})
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "description"):
            build_marketplace.build(self.root)

    def test_a_description_at_the_limit_passes(self) -> None:
        _skill(self.root, "workflow", "alpha")
        metadata = self.root / "published" / "workflow" / "alpha" / "metadata.json"
        at_limit = "x" * build_marketplace.MAX_DESCRIPTION
        metadata.write_text(json.dumps({"name": "alpha", "version": "1.2.3", "description": at_limit}), encoding="utf-8")
        self._config({"alpha": {"category": "workflow"}})
        [plugin] = build_marketplace.build(self.root)["plugins"]
        self.assertEqual(plugin["description"], at_limit)

    def test_a_configured_skill_that_is_not_published_fails(self) -> None:
        self._config({"ghost": {"category": "workflow"}})
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "no published skill"):
            build_marketplace.build(self.root)


class TestCommittedMarketplace(unittest.TestCase):
    def test_the_committed_marketplace_matches_the_published_skills(self) -> None:
        self.assertEqual(build_marketplace.main(["--check"]), 0, "run `python build_marketplace.py`")

    def test_every_plugin_source_is_a_published_skill(self) -> None:
        marketplace = json.loads((REPO / build_marketplace.MARKETPLACE).read_text(encoding="utf-8"))
        self.assertGreater(len(marketplace["plugins"]), 0)
        for plugin in marketplace["plugins"]:
            self.assertTrue((REPO / plugin["source"] / "SKILL.md").is_file(), plugin["name"])


if __name__ == "__main__":
    unittest.main()
