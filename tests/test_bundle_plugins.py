"""Bundle publishing and validation, exercised only in temporary repositories."""

from __future__ import annotations

import contextlib
import io
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

import build_marketplace  # noqa: E402
import tag_published  # noqa: E402


class TestBundlePlugins(unittest.TestCase):
    def setUp(self) -> None:
        self.root = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)
        self.name = "gamedev-example"
        self.source = self.root / "skills" / self.name
        self.published = self.root / "published" / "gamedev" / self.name
        self._write(self.source / "metadata.json", json.dumps({
            "name": self.name, "version": "0.1.0", "description": "Related game development skills.", "kind": "bundle",
        }))
        self._write(self.source / "README.md", "# Example bundle\n")
        self._write(self.source / "CHANGELOG.md", "# Changelog\n\n## [0.1.0]\n- Skeleton.\n")
        self._write(self.source / "skills" / ".gitkeep", "")
        self._write(self.root / "install.config.json", json.dumps({
            "schemaVersion": 2, "skills": {self.name: {"category": "gamedev", "kind": "bundle"}},
        }))
        for script in ("automate_publish.py", "build_marketplace.py", "antigravity_manifest.py"):
            shutil.copyfile(REPO / script, self.root / script)

    @staticmethod
    def _write(path: pathlib.Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def _skill(self, name: str, text: str | None = None) -> pathlib.Path:
        folder = self.source / "skills" / name
        self._write(folder / "SKILL.md", text if text is not None else
                    f"---\nname: {name}\ndescription: Use for {name} work.\n---\n\n# {name}\n")
        self._write(folder / "references" / "notes.md", "# Engine notes\n")
        self._write(folder / "scripts" / "check.py", "print('check')\n")
        return folder / "SKILL.md"

    def _publish(self, bump: str = "patch") -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(self.root / "automate_publish.py"), self.name, "gamedev", "Add related skills",
             "--bump", bump], cwd=self.root, capture_output=True, text=True, encoding="utf-8", check=False, timeout=10,
        )

    def test_publish_two_skills_as_one_plugin_with_one_version_and_changelog(self) -> None:
        self._skill("strands")
        self._skill("beards")
        result = self._publish("minor")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        marketplace = json.loads((self.root / build_marketplace.MARKETPLACE).read_text(encoding="utf-8"))
        self.assertEqual(marketplace["plugins"], [{
            "name": self.name, "source": "./published/gamedev/" + self.name,
            "description": "Related game development skills.", "version": "0.2.0", "category": "gamedev",
            "strict": False, "skills": ["./skills/beards", "./skills/strands"],
        }])
        self.assertFalse((self.published / "SKILL.md").exists())
        self.assertFalse((self.published / ".claude-plugin" / "plugin.json").exists())
        antigravity = json.loads((self.published / ".antigravity-plugin" / "plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(antigravity["version"], "0.2.0")
        self.assertNotIn("skills", antigravity, "a bundle's nested skills load without a skills entry")
        for path in self.source.rglob("*"):
            if path.is_file():
                self.assertEqual((self.published / path.relative_to(self.source)).read_bytes(), path.read_bytes())
        self.assertEqual(json.loads((self.source / "metadata.json").read_text(encoding="utf-8"))["version"], "0.2.0")
        changelog = (self.source / "CHANGELOG.md").read_text(encoding="utf-8")
        self.assertIn("## [0.2.0]", changelog)
        self.assertIn("- Add related skills", changelog)

    def test_empty_bundle_fails_before_bumping_or_copying(self) -> None:
        before = {path.name: path.read_bytes() for path in self.source.iterdir() if path.is_file()}
        result = self._publish()
        self.assertIn("at least one skill", result.stdout + result.stderr)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual({path.name: path.read_bytes() for path in self.source.iterdir() if path.is_file()}, before)
        self.assertFalse(self.published.exists())
        self.assertFalse((self.root / build_marketplace.MARKETPLACE).exists())

    def test_marketplace_skips_unpublished_empty_skeleton_with_a_message(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stderr(output):
            marketplace = build_marketplace.build(self.root)
        self.assertEqual(marketplace["plugins"], [])
        self.assertIn(self.name, output.getvalue())
        self.assertIn("at least one skill", output.getvalue())

    def test_marketplace_does_not_hide_a_populated_but_unpublished_bundle(self) -> None:
        self._skill("strands")
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "no published bundle"):
            build_marketplace.build(self.root)

    def test_marketplace_rejects_a_published_empty_bundle(self) -> None:
        shutil.copytree(self.source, self.published)
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "at least one skill"):
            build_marketplace.build(self.root)

    def test_publish_rejects_invalid_frontmatter_without_changing_a_previous_release(self) -> None:
        path = self._skill("strands")
        self._skill("beards")
        shutil.copytree(self.source, self.published)
        before = {file.relative_to(self.root): file.read_bytes()
                  for folder in (self.source, self.published) for file in folder.rglob("*") if file.is_file()}
        bad_documents = (
            "# No frontmatter\n",
            "---\nname: strands\n---\n",
            "---\ndescription: Missing name.\n---\n",
            "---\nname: strands\ndescription: \n---\n",
            "---\nname: strands\ndescription: " + "x" * 501 + "\n---\n",
            "---\nname: another-skill\ndescription: Wrong name.\n---\n",
            "---\nname: strands\ndescription: invalid: nested mapping\n---\n",
            "---\nname: strands\ndescription: [not, a, string]\n---\n",
            "---\nname: strands\ndescription: true\n---\n",
            "---\nname: strands\ndescription: .NaN\n---\n",
            "---\nname: strands\ndescription: '   '\n---\n",
            "---\nname: strands\ndescription: 'unclosed\n---\n",
            "---\nname: strands\ndescription: \"unclosed\n---\n",
            "---\nname: strands\nname: strands\ndescription: Duplicate key.\n---\n",
            "---\nname: strands\ndescription: A string.\nmalformed line\n---\n",
            "---\nname: strands\ndescription: Unterminated.\n",
        )
        for text in bad_documents:
            with self.subTest(frontmatter=text):
                for relative, content in before.items():
                    (self.root / relative).write_bytes(content)
                path.write_text(text, encoding="utf-8")
                result = self._publish()
                self.assertIn("frontmatter", result.stdout + result.stderr)
                self.assertNotEqual(result.returncode, 0)
                for relative, content in before.items():
                    if self.root / relative != path:
                        self.assertEqual((self.root / relative).read_bytes(), content, str(relative))

    def test_marketplace_validates_each_bundled_skill_too(self) -> None:
        self._skill("strands")
        self._skill("beards", "---\nname: beards\ndescription: invalid: YAML\n---\n")
        shutil.copytree(self.source, self.published)
        with self.assertRaisesRegex(build_marketplace.MarketplaceError, "beards.*frontmatter"):
            build_marketplace.build(self.root)

    def test_description_at_the_limit_and_quoted_frontmatter_publish(self) -> None:
        self._skill("strands", '---\nname: "strands"\ndescription: "' + "x" * 500 + '"\n---\n')
        self._skill("beards", "---\nname: 'beards'\ndescription: 'Use for beards: shaping and trimming.'\n---\n")
        result = self._publish()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_bundle_metadata_description_is_checked_before_any_mutation(self) -> None:
        self._skill("strands")
        metadata = self.source / "metadata.json"
        data = json.loads(metadata.read_text(encoding="utf-8"))
        data["description"] = "x" * 501
        metadata.write_text(json.dumps(data), encoding="utf-8")
        before = metadata.read_bytes()
        result = self._publish()
        self.assertIn("description", result.stdout + result.stderr)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(metadata.read_bytes(), before)
        self.assertFalse(self.published.exists())

    def test_config_and_metadata_must_both_mark_the_bundle(self) -> None:
        self._skill("strands")
        metadata = self.source / "metadata.json"
        data = json.loads(metadata.read_text(encoding="utf-8"))
        del data["kind"]
        metadata.write_text(json.dumps(data), encoding="utf-8")
        result = self._publish()
        self.assertIn("kind", result.stdout + result.stderr)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(json.loads(metadata.read_text(encoding="utf-8"))["version"], "0.1.0")

    def test_tags_are_per_bundle_not_per_bundled_skill(self) -> None:
        self._skill("strands")
        self._skill("beards")
        self._write(self.source / "skills" / "beards" / "metadata.json", json.dumps({"version": "9.0.0"}))
        shutil.copytree(self.source, self.published)
        self.assertEqual(tag_published.published_versions(self.root / "published"), {self.name: "0.1.0"})

    def test_a_skill_directory_without_skill_md_is_not_silently_omitted(self) -> None:
        self._skill("strands")
        self._write(self.source / "skills" / "unfinished" / "README.md", "# Work in progress\n")
        result = self._publish()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unfinished", result.stdout + result.stderr)
        self.assertIn("SKILL.md", result.stdout + result.stderr)


class TestGameDevelopmentSkeletons(unittest.TestCase):
    def test_five_game_development_bundles_are_registered_and_valid(self) -> None:
        names = ("gamedev-hair", "gamedev-assets", "gamedev-animation", "gamedev-cinematics", "gamedev-design")
        config = json.loads((REPO / "install.config.json").read_text(encoding="utf-8"))["skills"]
        for name in names:
            with self.subTest(plugin=name):
                self.assertEqual(config.get(name), {"category": "gamedev", "kind": "bundle"})
                folder = REPO / "skills" / name
                metadata = json.loads((folder / "metadata.json").read_text(encoding="utf-8"))
                self.assertEqual((metadata["name"], metadata["kind"]), (name, "bundle"))
                self.assertTrue(metadata["description"])
                self.assertLessEqual(len(metadata["description"]), 500)
                # Empty today, populated by contributors later: both states must keep passing the suite.
                build_marketplace.bundle_skills(folder, allow_empty=True)
                self.assertTrue((folder / "README.md").is_file())
                self.assertTrue((folder / "CHANGELOG.md").is_file())


if __name__ == "__main__":
    unittest.main()
