---
name: skill-publisher
description: Standardize and automate the publishing of stable skills from the development directory to the 'published' directory.
---

# Skill Publisher

This skill helps you maintain the integrity of official skills by automating the synchronization between the development `skills/` directory and the public-facing `published/` directory.

## Publishing Protocol

When a user asks you to "publish" or "sync" a skill, use the automated script:

```bash
python automate_publish.py <skill-name> <category> "<summary>" --bump <patch|minor|major>
```

### 1. Categories
The category is the skill's folder under `published/` and its `category` in `install.config.json`; the two must
agree. Every published skill is in `workflow/` today. A new skill is registered in `install.config.json` before its
first publish (the marketplace is built from that list).

### 2. Validation Checklist (Manual)
Before running the script, ensure:
- [ ] `SKILL.md`: Correct frontmatter (name, description); no relative link to another skill's folder (a plugin
      holds one skill alone: name the other skill instead).
- [ ] `README.md`, `metadata.json` and `CHANGELOG.md`: present and accurate.
- [ ] Tests: the skill's tests in `tests/` pass.

### 3. Automated Actions
The `automate_publish.py` script will:
1. Increment the version in `skills/<skill-name>/metadata.json`.
2. Append the summary to `skills/<skill-name>/CHANGELOG.md`.
3. Recursively copy the source to `published/<category>/<skill-name>`.
4. Regenerate the plugin marketplace (`.claude-plugin/marketplace.json`, via `build_marketplace.py`).

## Finalize
1. Run the whole suite (`python -m unittest discover -s tests -p "test_*.py"`) and `claude plugin validate .`.
2. Commit with a clear message: `feat(published): sync skill '<skill-name>' to version <new-version>`.
3. Tag and push: `python tag_published.py --push` creates `<skill>@<version>` for every published version not yet
   tagged — projects that run a skill's scripts from CI or git hooks pin it by that tag. Then push the commit.
