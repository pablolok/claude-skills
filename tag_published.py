"""Tag every published skill's current version: ``<skill>@<version>`` on the commit that carries it.

A project that runs a skill's scripts outside Claude Code (CI, git hooks) pins the skill by this tag, so the tag must
exist for every version that is published. Run after committing a publish (the publish itself happens before the
commit, so it cannot tag); pushing the tags is ``--push``.

    python tag_published.py          # create the missing tags at HEAD
    python tag_published.py --push   # ... and push every published version's tag that origin lacks

A tag that already exists is never moved: the version it names is already in use. A skill whose published
version differs from the one committed at HEAD (uncommitted publish) is refused. ``--push`` asks origin which tags
it has, rather than pushing only the ones created in this run: a tag created by an earlier run without ``--push``
would otherwise never leave this machine.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import typing

REPO = pathlib.Path(__file__).resolve().parent
PUBLISHED = "published"
REMOTE = "origin"
TAG_REF_PREFIX = "refs/tags/"
PEELED_SUFFIX = "^{}"


def _git(repo: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, check=False)


def published_versions(published: pathlib.Path) -> typing.Dict[str, str]:
    """``{skill: version}`` for every published skill with a metadata.json."""
    versions = {}
    for metadata in sorted(published.glob("*/*/metadata.json")):
        versions[metadata.parent.name] = json.loads(metadata.read_text(encoding="utf-8"))["version"]
    return versions


def tag_name(skill: str, version: str) -> str:
    """The tag a project pins: ``backlog@1.1.0``."""
    return f"{skill}@{version}"


def remote_tags(ls_remote_output: str) -> typing.Set[str]:
    """The tag names in ``git ls-remote --tags`` output (an annotated tag's peeled ``^{}`` line counts once)."""
    tags = set()
    for line in ls_remote_output.splitlines():
        ref = line.split("\t")[-1].strip()
        if ref.startswith(TAG_REF_PREFIX):
            tags.add(ref[len(TAG_REF_PREFIX):].removesuffix(PEELED_SUFFIX))
    return tags


def missing_on_remote(wanted: typing.Iterable[str], on_remote: typing.Set[str]) -> typing.List[str]:
    """The wanted tags origin does not have, in the order given."""
    return [tag for tag in wanted if tag not in on_remote]


def main(argv: typing.Optional[typing.Sequence[str]] = None, repo: pathlib.Path = REPO) -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--push", action="store_true", help="push every published version's tag that origin lacks")
    args = parser.parse_args(argv)
    if _git(repo, "status", "--porcelain", "--", PUBLISHED).stdout.strip():
        print("published/ has uncommitted changes: commit the publish first", file=sys.stderr)
        return 1
    existing = set(_git(repo, "tag", "--list").stdout.split())
    wanted = [tag_name(skill, version) for skill, version in published_versions(repo / PUBLISHED).items()]
    created = []
    for tag in wanted:
        if tag in existing:
            continue
        result = _git(repo, "tag", tag)
        if result.returncode != 0:
            print(f"could not tag {tag}: {result.stderr.strip()}", file=sys.stderr)
            return 1
        created.append(tag)
    print(f"created {len(created)} tag(s): {', '.join(created) or 'none'}")
    if not args.push:
        return 0
    listed = _git(repo, "ls-remote", "--tags", REMOTE)
    if listed.returncode != 0:
        print(f"could not list {REMOTE}'s tags: {listed.stderr.strip()}", file=sys.stderr)
        return 1
    to_push = missing_on_remote(wanted, remote_tags(listed.stdout))
    if not to_push:
        print(f"{REMOTE} already has every published version's tag")
        return 0
    result = _git(repo, "push", REMOTE, *to_push)
    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        return 1
    print(f"pushed {len(to_push)} tag(s): {', '.join(to_push)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
