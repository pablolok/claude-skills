# CLAUDE.md

This repository is the source of the developer's Claude Code skills and the plugin marketplace `pablolok-skills`
that ships them: every published skill is a plugin of its own.

## Layout

- `skills/<skill>/` is the source of each skill: `SKILL.md`, `README.md`, `metadata.json` (name, version,
  description), `CHANGELOG.md`, and whatever the skill runs (scripts, hooks). Edit skills here.
- `published/<category>/<skill>/` is the published copy, the folder each plugin installs. It is written only by the
  publish flow, never by hand.
- `install.config.json` lists the published skills and their category (`workflow` for all of them today).
- `.claude-plugin/marketplace.json` is generated from `install.config.json` and `published/` by
  `build_marketplace.py` — never edited by hand. A skill that needs hooks or commands as a plugin declares them in its
  own `plugin-entry.json`; one that cannot be a plugin sets `"plugin": false` in `install.config.json`.
- `skills/skill-publisher/` is this repository's own skill (the publish flow). It is not published.
- `tests/` holds one test file per skill plus the marketplace and policy tests.

## Installing a skill

```bash
claude plugin marketplace add pablolok/claude-skills
claude plugin install <skill>@pablolok-skills [--scope user|project]
claude plugin update <skill>@pablolok-skills
```

A plugin skill is named `<plugin>:<skill>` inside a session (e.g. `backlog:backlog`).

## Publishing

For a request to `publish`, `sync` or `republish` a skill, follow `skills/skill-publisher/SKILL.md`; never edit
`published/` or the marketplace by hand.

1. `python automate_publish.py <skill> <category> "<summary>" --bump <patch|minor|major>` — bumps
   `metadata.json`, adds the summary to `CHANGELOG.md`, copies the skill to `published/`, regenerates the marketplace.
2. `python -m unittest discover -s tests -p "test_*.py"`
3. `claude plugin validate .` (and `python build_marketplace.py --check`)
4. Commit (`feat(<skill>): <version> — <what changed>`, or `fix(...)`, `docs(...)`, `chore(...)`).
5. `python tag_published.py` tags `<skill>@<version>` for every published version not yet tagged (`--push` pushes
   the tags) — projects that run a skill's scripts from CI or git hooks pin it by that tag.

A new skill is registered in `install.config.json` and gets its test file in the same change. A skill's text never
links to another skill's folder (`../other/SKILL.md`): a plugin holds one skill alone, so it names the other skill.

## Skill Retrospective On This Repo

- This repository runs `skill-retrospective` on its own work: install the plugin at user scope
  (`claude plugin install skill-retrospective@pablolok-skills --scope user`); its two hooks come with it.
- A lesson about a skill is written in `skills/<skill>/` and published with the flow above — never in an installed
  copy (the plugin cache), which the next update overwrites.
