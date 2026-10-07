"""Tests for tag_published: which tags exist, which are pushed — every published version's tag missing on origin."""

from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import tag_published  # noqa: E402  pylint: disable=wrong-import-position


def _git(cwd: pathlib.Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


class TestRemoteTags(unittest.TestCase):
    def test_reads_the_tag_names_from_ls_remote_output(self) -> None:
        output = "abc123\trefs/tags/backlog@1.1.0\nfff000\trefs/tags/backlog@1.1.0^{}\ndef456\trefs/tags/x@2.0.0\n"
        self.assertEqual(tag_published.remote_tags(output), {"backlog@1.1.0", "x@2.0.0"})

    def test_missing_on_remote_is_what_the_published_versions_need_and_origin_lacks(self) -> None:
        wanted = ["a@1.0.0", "b@2.0.0", "c@1.1.0"]
        self.assertEqual(tag_published.missing_on_remote(wanted, {"b@2.0.0"}), ["a@1.0.0", "c@1.1.0"])


@unittest.skipUnless(shutil.which("git"), "git is not installed")
class TestPush(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.origin = self.tmp / "origin.git"
        self.repo = self.tmp / "repo"
        _git(self.tmp, "init", "-q", "--bare", str(self.origin))
        _git(self.tmp, "init", "-q", str(self.repo))
        for key, value in (("user.name", "t"), ("user.email", "t@example.com"), ("commit.gpgsign", "false")):
            _git(self.repo, "config", key, value)
        _git(self.repo, "remote", "add", "origin", str(self.origin))
        metadata = self.repo / "published" / "workflow" / "alpha" / "metadata.json"
        metadata.parent.mkdir(parents=True)
        metadata.write_text(json.dumps({"name": "alpha", "version": "1.0.0"}), encoding="utf-8")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-q", "-m", "publish alpha")
        _git(self.repo, "push", "-q", "origin", "HEAD:refs/heads/main")

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _origin_tags(self) -> set:
        return set(_git(self.origin, "tag", "--list").split())

    def test_push_sends_a_tag_created_earlier_without_push(self) -> None:
        self.assertEqual(tag_published.main([], repo=self.repo), 0)
        self.assertEqual(self._origin_tags(), set())
        self.assertEqual(tag_published.main(["--push"], repo=self.repo), 0)
        self.assertEqual(self._origin_tags(), {"alpha@1.0.0"})

    def test_push_with_nothing_missing_changes_nothing(self) -> None:
        self.assertEqual(tag_published.main(["--push"], repo=self.repo), 0)
        self.assertEqual(tag_published.main(["--push"], repo=self.repo), 0)
        self.assertEqual(self._origin_tags(), {"alpha@1.0.0"})


if __name__ == "__main__":
    unittest.main()
