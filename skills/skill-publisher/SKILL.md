---
name: skill-publisher
description: Use in the claude-skills repository to add, change, publish, tag and roll out a skill of the pablolok-skills plugin marketplace — the whole path from an edit in skills/<skill>/ to the plugin updated on every machine and project that uses it. Trigger on "publish", "sync", "republish", "new skill", "release a skill", or after a skill-retrospective edited a skill here.
---

# Skill Publisher

Every skill here is a plugin of the marketplace `pablolok-skills`. Its source is `skills/<skill>/`; what users
install is `published/<category>/<skill>/` and `.claude-plugin/marketplace.json`, both written only by the scripts
below. A change is done when the plugin users get has it — not when the source file is saved.

## 1. Edit the source

- Edit `skills/<skill>/` only: `SKILL.md`, `README.md`, `metadata.json`, `CHANGELOG.md`, and what the skill runs.
  Never `published/`, the marketplace, or an installed copy in a plugin cache (the next update overwrites it).
- **A skill is generic.** It serves every project and every person: no person's name, no rule owned by someone
  (the user wants…), no project names, paths or examples, no dated quotes — the rule and a one-line reason, neutral
  examples (a job, a record, a config), in English. `tests/test_skills_are_generic.py` fails otherwise. Anything
  project-specific belongs in that project (`.claude/skills`, `.claude/rules`).
- **The description** is the trigger: one line, ≤ 500 characters (claude.ai drops a longer one), the same text in the
  `SKILL.md` frontmatter and in `metadata.json`.
- **No link to another skill's folder** (`../other/SKILL.md`): a plugin holds one skill alone, so name the skill.
- **Hooks or commands** a skill needs as a plugin are declared in its own `plugin-entry.json` (paths through
  `${CLAUDE_PLUGIN_ROOT}`); a hook finds the project through `CLAUDE_PROJECT_DIR`, never through its own folder.
- **A launcher** a project copies (`bootstrap/<name>.mjs`, e.g. backlog's `backlog-gate.mjs`, mermaid's `mermaid.mjs`)
  pins the skill's version in its `VERSION` line: bump it to the new version in the same change (a test checks).

## 2. A new skill

1. Create `skills/<skill>/` with `SKILL.md`, `README.md` (short: what it is and how it works), `CHANGELOG.md` and a
   `metadata.json` at version `0.9.0` (name, version, description).
2. Register it in `install.config.json` (`{"category": "workflow"}`; the category is its folder under `published/`).
3. Add `tests/test_<skill>_skill.py` (the shared checks live in `tests/published_skill_checks.py`).
4. Publish with `--bump major`: 0.9.0 becomes 1.0.0.

## 3. Publish

```bash
python automate_publish.py <skill> workflow "<summary>" --bump <patch|minor|major>
python -m unittest discover -s tests -p "test_*.py"
python build_marketplace.py --check
claude plugin validate .
```

- **Bump**: patch for a fix or a lesson in an existing step, minor for a new step or a removed section, major for a
  change that breaks how projects use it (a launcher's command, a hook's contract).
- `automate_publish.py` bumps `metadata.json`, adds the summary to `CHANGELOG.md`, copies the skill to `published/`
  and regenerates the marketplace. Several skills: run it once per skill, then the checks once.
- Continue only on green. A skipped test is not a pass: the mermaid end-to-end test needs mermaid and jsdom
  installed — it finds them in `MERMAID_DEPS_DIR`, or in the launcher's cache under `CLAUDE_SKILLS_CACHE` after one
  `node scripts/mermaid.mjs check …` in any project.

## 4. Commit, tag, push

```bash
git commit -m "feat(<skill>): <version> — <what changed>"   # fix(...) / docs(...) / chore(...); several: feat(a, b): 1.1.0 / 1.0.1 — …
git push origin HEAD
python tag_published.py --push
```

- The marketplace is read from `main` on GitHub: a commit not pushed is a version nobody gets.
- `tag_published.py` tags `<skill>@<version>` for every published version and, with `--push`, pushes every one origin
  lacks. Projects pin launchers by those tags; a launcher whose tag is missing cannot fetch its skill.

## 5. Roll it out

- **This machine**: `claude plugin marketplace update pablolok-skills`, then
  `claude plugin update <skill>@pablolok-skills` (first time: `claude plugin install <skill>@pablolok-skills
  --scope user`). An open session keeps what it loaded at start: the new version is there after a restart
  (`/compact` is not one). Install the new plugin before removing an old copy of the same skill, never the other way.
- **claude.ai**: the marketplace syncs from GitHub on its own; to force it, *Customize → Plugins → Add → Manage
  marketplaces → ⋮ → Check for updates*. A warning there (a description too long) means the plugin was synced
  without that part: fix it here and publish again.
- **Projects**: a project declares the plugins it needs in its `.claude/settings.json` (`extraKnownMarketplaces` +
  `enabledPlugins`), so a clone or a cloud session gets them. A project with a copied launcher pins a version: copy
  the new `bootstrap/<name>.mjs` over `scripts/<name>.mjs` when it should move to it, run it once, commit there.

## Environment

- `CLAUDE_SKILLS_REPO` — this clone's path; `skill-retrospective` edits and publishes skills here when it is set.
- `CLAUDE_SKILLS_CACHE` — where launchers keep the skills they fetch (and their npm dependencies); default
  `~/.cache/claude-skills`. Point it at a roomy disk.
