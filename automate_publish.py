"""Automate the publishing of official Claude skills."""

from __future__ import annotations

import argparse
import datetime
import json
import os
import pathlib
import shutil
import sys

import build_marketplace


def update_json_file(path: pathlib.Path, updates: dict) -> None:
    """Update a JSON file with the given dictionary."""
    data = json.loads(path.read_text(encoding="utf-8"))
    data.update(updates)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


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
) -> None:
    """Sync a skill from development to published directory."""
    source_path = pathlib.Path(skills_dir) / skill_name
    dest_path = pathlib.Path(published_dir) / category / skill_name
    
    if not source_path.exists():
        print(f"Error: Source skill not found at {source_path}")
        sys.exit(1)
        
    metadata_path = source_path / "metadata.json"
    if not metadata_path.exists():
        print(f"Error: metadata.json not found in {source_path}")
        sys.exit(1)
        
    # 1. Bump version in source
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    old_version = metadata.get("version", "1.0.0")
    new_version = bump_version(old_version, bump)
    update_json_file(metadata_path, {"version": new_version})
    print(f"Bumped version: {old_version} -> {new_version}")
    
    # 2. Update changelog in source
    update_changelog(source_path / "CHANGELOG.md", new_version, summary)
    
    # 3. Clean and copy to destination
    if dest_path.exists():
        shutil.rmtree(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_path, dest_path)
    print(f"Synced {skill_name} to {dest_path}")


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_name", help="Name of the skill directory in skills/")
    parser.add_argument("category", help="Destination category in published/ (audit, utility, workflow)")
    parser.add_argument("summary", help="Summary of changes for the changelog")
    parser.add_argument("--bump", choices=["major", "minor", "patch"], default="patch")
    
    args = parser.parse_args()
    publish_skill(args.skill_name, args.category, args.summary, args.bump)
    # The plugin marketplace is derived from published/: every publish refreshes it.
    sys.exit(build_marketplace.main([]))


if __name__ == "__main__":
    main()
