# Skill Retrospective

When a piece of work closes, what it taught goes back into the skills that served it — rewritten in place, pruned,
kept short — never appended as a lessons log. Two hooks make it happen without anyone having to remember.

## Installing

As a Claude Code plugin, at user scope (once per machine, every project):

```bash
claude plugin marketplace add pablolok/claude-skills
claude plugin install skill-retrospective@pablolok-skills --scope user
```

The plugin wires its two hooks itself (declared in `plugin-entry.json`): nothing is copied into a project and no
settings file is edited. The hooks run from the plugin cache and take the project from `CLAUDE_PROJECT_DIR`, which
Claude Code sets for every hook; without it they do nothing.

## What it holds

| File | Role |
|---|---|
| `SKILL.md` | The retrospective: evidence → rewrite each skill used → check → record. |
| `hooks/log-skill-use.mjs` | `PostToolUse` (matcher `Skill`): adds each skill run to `.claude/.state/skills-used.txt`, once. |
| `hooks/retrospective-hint.mjs` | `Stop`: holds the turn **once** (never with `stop_hook_active`) when, since the commit in `.claude/.state/last-retrospective`, a backlog entry was archived (under `SKILL_RETRO_ARCHIVE_DIRS`, default `docs/implementations/archive`) or `SKILL_RETRO_COMMITS` (default 8) commits piled up, and asks for the retrospective on the logged skills. |
| `hooks/state.mjs` | The project root (`CLAUDE_PROJECT_DIR` alone: never the shell's cwd, never the hooks' own folder) and the state folder. |
| `plugin-entry.json` | The two hooks, as the marketplace declares them for the plugin. |

## Requirements and conventions

- **Node** runs the hooks (it is there wherever Claude Code is, on Windows too — `python3` often is not).
- **git**: the hooks count commits; outside a repository they stay silent.
- The **archive trigger** follows a convention: a backlog entry is closed by moving its folder under
  `docs/implementations/archive/`. A project that archives elsewhere sets `SKILL_RETRO_ARCHIVE_DIRS` (repo-relative
  folders, comma-separated, e.g. `Tasks/archive`) — in the `env` block of its `.claude/settings.local.json` (or
  `settings.json`), which the hooks inherit. Only the first level under the folder is counted, so a nested archive
  gives a lower bound. A project with neither relies on the commit threshold alone (`SKILL_RETRO_COMMITS`, default 8).
- The **state** (`<project>/.claude/.state/`) is per machine and keeps itself out of git with its own `.gitignore`;
  the project's `.gitignore` is never edited. With no baseline yet, the first stop records HEAD and says nothing.

## Tests

```bash
node --test skills/skill-retrospective/hooks/hooks.test.mjs
python -m unittest tests.test_skill_retrospective_skill
```
