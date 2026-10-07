"""Tag every published skill's current version: ``<skill>@<version>`` on the commit that carries it.

A project that runs a skill's scripts outside Claude Code (CI, git hooks) pins the skill by this tag, so the tag must
exist for every version that is published. Run after committing a publish (the publish itself happens before the
commit, so it cannot tag); pushing the tags is ``--push``.

    python tag_published.py          # create the missing tags at HEAD
    python tag_published.py --push   # ... and push them to origin

A tag that already exists is never moved: the version it names is already in use. A skill whose published
version differs from the one committed at HEAD (uncommitted publish) is refused.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import typing

REPO = pathlib.Path(__file__).resolve().parent
PUBLISHED = REPO / "published"


def _git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True, check=False)


def published_versions(published: pathlib.Path = PUBLISHED) -> typing.Dict[str, str]:
    """``{skill: version}`` for every published skill with a metadata.json."""
    versions = {}
    for metadata in sorted(published.glob("*/*/metadata.json")):
        versions[metadata.parent.name] = json.loads(metadata.read_text(encoding="utf-8"))["version"]
    return versions


def tag_name(skill: str, version: str) -> str:
    """The tag a project pins: ``backlog@1.1.0``."""
    return f"{skill}@{version}"


def main(argv: typing.Optional[typing.Sequence[str]] = None) -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--push", action="store_true", help="push the created tags to origin")
    args = parser.parse_args(argv)
    if _git("status", "--porcelain", "--", "published").stdout.strip():
        print("published/ has uncommitted changes: commit the publish first", file=sys.stderr)
        return 1
    existing = set(_git("tag", "--list").stdout.split())
    created = []
    for skill, version in published_versions().items():
        tag = tag_name(skill, version)
        if tag in existing:
            continue
        result = _git("tag", tag)
        if result.returncode != 0:
            print(f"could not tag {tag}: {result.stderr.strip()}", file=sys.stderr)
            return 1
        created.append(tag)
    print(f"created {len(created)} tag(s): {', '.join(created) or 'none'}")
    if args.push and created:
        result = _git("push", "origin", *created)
        if result.returncode != 0:
            print(result.stderr.strip(), file=sys.stderr)
            return 1
        print("pushed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
