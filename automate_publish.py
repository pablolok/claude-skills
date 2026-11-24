"""Automate the publishing of official Claude skills."""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import shutil
import sys
import typing

import antigravity_manifest
import build_marketplace

#: Files Claude Code writes into a mod's folder each time it loads it from source (`--plugin-dir`): the type
#: declarations for the running version, and a tsconfig that extends them. Derived, machine-specific, never published.
PLUGIN_FOLDER = ".claude-plugin"
GENERATED_TYPES = "types"
GENERATED_TSCONFIG = "tsconfig.json"
#: A mod's own manifest. When it declares a version, Claude Code takes that one over the marketplace entry's, so a
#: stale one hides every later publish from `claude plugin update`.
PLUGIN_MANIFEST = pathlib.Path(PLUGIN_FOLDER) / "plugin.json"


def _skip_generated(folder: str, names: typing.List[str]) -> typing.Set[str]:
    """The generated files among a folder's entries: the types inside `.claude-plugin`, the tsconfig beside it."""
    here = pathlib.Path(folder)
    skipped = set()
    if here.name == PLUGIN_FOLDER and GENERATED_TYPES in names:
        skipped.add(GENERATED_TYPES)
    if (here / PLUGIN_FOLDER).is_dir() and GENERATED_TSCONFIG in names:
        skipped.add(GENERATED_TSCONFIG)
    return skipped


def _published_ignore(source: pathlib.Path) -> typing.Callable[[str, typing.List[str]], typing.Set[str]]:
    """What the Claude copy leaves out: the generated files, and the source's Antigravity overlay at its root (laid over
    the Antigravity copy instead, see ``antigravity_manifest.OVERLAY``)."""
    root = source.resolve()

    def ignore(folder: str, names: typing.List[str]) -> typing.Set[str]:
        skipped = _skip_generated(folder, names)
        if pathlib.Path(folder).resolve() == root and antigravity_manifest.OVERLAY in names:
            skipped.add(antigravity_manifest.OVERLAY)
        return skipped
    return ignore


def update_json_file(path: pathlib.Path, updates: dict) -> None:
    """Update a JSON file with the given dictionary."""
    data = json.loads(path.read_text(encoding="utf-8"))
    data.update(updates)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def sync_manifest_version(source_path: pathlib.Path, version: str) -> bool:
    """Give the skill's own manifest the published version when it declares one; True when the file changed."""
    manifest = source_path / PLUGIN_MANIFEST
    if not manifest.is_file():
        return False
    declared = json.loads(manifest.read_text(encoding="utf-8")).get("version")
    if declared is None or declared == version:
        return False
    update_json_file(manifest, {"version": version})
    return True


def bump_version(version: str, part: str = "patch") -> str:
    """Increment a SemVer version string."""
    parts = list(map(int, version.split(".")))
    if part == "major":
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0
    elif part == "minor":
        parts[1] += 1
        parts[2] = 0
    else:
        parts[2] += 1
    return ".".join(map(str, parts))


def update_changelog(path: pathlib.Path, version: str, summary: str) -> None:
    """Append a new entry to the CHANGELOG.md file."""
    date_str = datetime.date.today().isoformat()
    entry = f"\n## [{version}] - {date_str}\n- {summary}\n"
    
    if path.exists():
        content = path.read_text(encoding="utf-8")
        if "# Changelog" in content:
            # Insert after the header
            parts = content.split("# Changelog", 1)
            new_content = parts[0] + "# Changelog\n" + entry + parts[1]
            path.write_text(new_content, encoding="utf-8")
        else:
            path.write_text(entry + content, encoding="utf-8")
    else:
        path.write_text(f"# Changelog\n{entry}", encoding="utf-8")


def publish_skill(
    skill_name: str,
    category: str,
    summary: str,
    bump: str = "patch",
    skills_dir: str = "skills",
    published_dir: str = "published",
    bundle: typing.Optional[bool] = None,
    antigravity_dir: typing.Optional[str] = None,
) -> None:
    """Bump and copy a single skill or bundle from development to the published directory.

    The published folder then gets its Antigravity manifest, or, when it has Claude agents or its source an
    ``antigravity/`` overlay, a separate Antigravity copy under ``antigravity_dir`` (default: ``published-antigravity``
    beside ``published_dir``). The overlay is left out of the published folder and laid over that copy.
    """
    source_path = pathlib.Path(skills_dir) / skill_name
    dest_path = pathlib.Path(published_dir) / category / skill_name
    antigravity_tree = (pathlib.Path(antigravity_dir) if antigravity_dir is not None
                        else pathlib.Path(published_dir).parent / antigravity_manifest.TREE)
    
    if not source_path.exists():
        print(f"Error: Source skill not found at {source_path}")
        sys.exit(1)
        
    metadata_path = source_path / "metadata.json"
    if not metadata_path.exists():
        print(f"Error: metadata.json not found in {source_path}")
        sys.exit(1)
        
    # Validate bundles before bumping, changing the changelog, or replacing a previous release.
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    is_bundle = metadata.get("kind") == "bundle"
    if bundle is not None and is_bundle != bundle:
        raise build_marketplace.MarketplaceError(
            f"{skill_name}: kind must agree in install.config.json and metadata.json"
        )
    if is_bundle:
        build_marketplace.bundle_skills(source_path)
    if (source_path / antigravity_manifest.MANIFEST).exists():
        raise build_marketplace.MarketplaceError(
            f"{skill_name}: {antigravity_manifest.MANIFEST.as_posix()} is generated by the publish; "
            "remove it from the source"
        )
    overlay = source_path / antigravity_manifest.OVERLAY
    overlay_problems = antigravity_manifest.overlay_problems(overlay)
    if overlay_problems:
        raise build_marketplace.MarketplaceError(f"{skill_name}: {'; '.join(overlay_problems)}")

    # 1. Bump version in source
    old_version = metadata.get("version", "1.0.0")
    new_version = bump_version(old_version, bump)
    update_json_file(metadata_path, {"version": new_version})
    print(f"Bumped version: {old_version} -> {new_version}")
    if sync_manifest_version(source_path, new_version):
        print(f"Set {PLUGIN_MANIFEST.as_posix()} version: {new_version}")

    # 2. Update changelog in source
    update_changelog(source_path / "CHANGELOG.md", new_version, summary)
    
    # 3. Clean and copy to destination
    if dest_path.exists():
        shutil.rmtree(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_path, dest_path, ignore=_published_ignore(source_path))
    print(f"Synced {skill_name} to {dest_path}")

    # 4. The Antigravity manifest: in the published folder, or on a separate copy (with the overlay laid over it) when
    #    it has Claude agents or an overlay.
    antigravity_folder = antigravity_manifest.publish(dest_path, category, antigravity_tree, overlay)
    print(f"Wrote {(antigravity_folder / antigravity_manifest.MANIFEST).as_posix()}")


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_name", help="Name of the skill or bundle directory in skills/")
    parser.add_argument("category", help="Destination category in published/ (e.g. workflow, gamedev)")
    parser.add_argument("summary", help="Summary of changes for the changelog")
    parser.add_argument("--bump", choices=["major", "minor", "patch"], default="patch")
    
    args = parser.parse_args()
    try:
        config = build_marketplace._read_json(pathlib.Path(build_marketplace.INSTALL_CONFIG)).get("skills", {})
        bundle = config.get(args.skill_name, {}).get("kind") == "bundle"
        publish_skill(args.skill_name, args.category, args.summary, args.bump, bundle=bundle)
    except build_marketplace.MarketplaceError as exc:
        print(f"publish: {exc}", file=sys.stderr)
        sys.exit(2)
    # The plugin marketplace is derived from published/: every publish refreshes it.
    sys.exit(build_marketplace.main([]))


if __name__ == "__main__":
    main()
