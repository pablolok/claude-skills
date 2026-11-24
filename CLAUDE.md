# CLAUDE.md

This repository is the source of a set of Claude Code skills and the plugin marketplace `pablolok-skills`
that ships them: individual workflow skills and bundles of related game development skills are plugins.

## Layout

- `skills/<skill>/` is the source of each skill: `SKILL.md`, `README.md`, `metadata.json` (name, version,
  description), `CHANGELOG.md`, and whatever the skill runs (scripts, hooks). Edit skills here.
- `skills/<plugin>/` with `"kind": "bundle"` in metadata holds a README, metadata, CHANGELOG and
  `skills/<skill>/SKILL.md` plus each skill's references/scripts; bundles have one version for all their skills.
- `published/<category>/<plugin>/` is the published copy, the folder each plugin installs. It is written only by the
  publish flow, never by hand. Each plugin there carries a generated `.antigravity-plugin/plugin.json` for Google
  Antigravity; `published-antigravity/<category>/<plugin>/` holds the generated Antigravity copy (no `agents/`) of a
  plugin that ships Claude-format agents. Like `published/`, it is written only by the publish flow.
- `install.config.json` lists plugins in `workflow` or `gamedev`; bundles also declare `"kind": "bundle"` there.
  Empty bundle skeletons are not published or listed in the marketplace.
- `.claude-plugin/marketplace.json` is generated from `install.config.json` and `published/` by
  `build_marketplace.py` — never edited by hand. A skill that needs hooks or commands as a plugin declares them in its
  own `plugin-entry.json` (a mod, which ships its own `.claude-plugin/plugin.json`, declares `"strict": true` there);
  one that cannot be a plugin sets `"plugin": false` in `install.config.json`, and a mod that carries no skill (its
  manifest and hooks module alone, no `SKILL.md`) sets `"skill": false` there.
- `skills/skill-publisher/` is this repository's own skill (the publish flow). It is not published.
- `bootstrap/claude-skills.mjs` is the managed-copies tool a shared or cloud project copies as
  `scripts/claude-skills.mjs` (`sync`, `check`, `list`; see the README). Its pure decisions are tested in
  `bootstrap/claude-skills.test.mjs`, the commands end to end in `tests/test_claude_skills_tool.py`.
- `bootstrap/antigravity-plugins.mjs` (and the macOS `install-antigravity.command` wrapper) merges this clone's
  `published/` and `published-antigravity/` folders into `~/.gemini/config/plugins.json`, the way Antigravity loads
  plugins (no marketplace); tested in `bootstrap/antigravity-plugins.test.mjs`.
- `tests/` holds one test file per skill plus the marketplace and policy tests.

## Installing a skill

```bash
claude plugin marketplace add pablolok/claude-skills
claude plugin install <skill>@pablolok-skills [--scope user|project]
claude plugin update <skill>@pablolok-skills
```

A plugin skill is named `<plugin>:<skill>` inside a session (e.g. `backlog:backlog`).

## Publishing

Any change to a skill — an edit, a new skill, a lesson from `skill-retrospective` — follows
`skills/skill-publisher/SKILL.md` end to end: edit the source (generic, English, description ≤ 500 characters),
`automate_publish.py`, the suite and the checks (including a non-strict `agy plugin validate`, skipped when `agy` is
missing), commit, push, `tag_published.py --push`, then roll it out (`claude plugin update`, a restart, the projects'
launchers, `node bootstrap/antigravity-plugins.mjs` for Antigravity). Never edit `published/`, `published-antigravity/`, the marketplace or an installed
copy by hand.

## Skill Retrospective On This Repo

- This repository runs `skill-retrospective` on its own work: install the plugin at user scope
  (`claude plugin install skill-retrospective@pablolok-skills --scope user`); its two hooks come with it, and the close
  steps of `backlog` and `jira-workflow` invoke it.
- A lesson about a skill is written in `skills/<skill>/` and published with the flow above — never in an installed
  copy (the plugin cache), which the next update overwrites.
