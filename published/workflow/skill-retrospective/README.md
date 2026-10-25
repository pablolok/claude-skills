# Skill Retrospective

At the close of work, check the evidence already collected for errors, repeated attempts, user corrections or
conflicting instructions. With no observed problem, complete the brief check without transcript sweeps or skill
edits. An observed problem opens only the relevant section of the implicated skill at its source. Commits, tags,
publishing and rollout follow the user's authorization; a closing trigger does not authorize them.

The close steps of `backlog` and `jira-workflow`, and the existing Stop hint, invoke this brief check. The skill-use
hook supplies context for a targeted investigation; it does not identify a mandatory list of skills to rewrite.

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
| `SKILL.md` | Brief closing check; no-change outcome or targeted investigation and checkpoint. |
| `references/investigation-and-rewrite.md` | Detailed procedure, read only for an observed problem. |
| `hooks/log-skill-use.mjs` | `PostToolUse` (matcher `Skill`): adds each skill run to `.claude/.state/skills-used.txt`, once. |
| `hooks/retrospective-hint.mjs` | `Stop`: holds the turn **once** (never with `stop_hook_active`) when, since the commit in `.claude/.state/last-retrospective`, a backlog entry was archived (under `SKILL_RETRO_ARCHIVE_DIRS`, else the backlog's `<docsDir>/archive`, default `docs/implementations/archive`) or `SKILL_RETRO_COMMITS` (default 8) commits piled up, and asks for the retrospective on the logged skills. |
| `hooks/state.mjs` | The project root (`CLAUDE_PROJECT_DIR` alone: never the shell's cwd, never the hooks' own folder) and the state folder. |
| `plugin-entry.json` | The two hooks, as the marketplace declares them for the plugin. |

## Requirements and conventions

- **Node** runs the hooks (it is there wherever Claude Code is, on Windows too — `python3` often is not).
- **git**: the hooks count commits; outside a repository they stay silent.
- The **archive trigger** follows a convention: a backlog entry is closed by moving its folder under
  `<docsDir>/archive/` — `docsDir` read from the project's backlog config (`.claude/backlog.json`) when it declares
  one, else `docs/implementations`. A project that archives elsewhere sets `SKILL_RETRO_ARCHIVE_DIRS` (repo-relative
  folders, comma-separated, e.g. `Tasks/archive`; it wins over the config) — in the `env` block of its
  `.claude/settings.local.json` (or `settings.json`), which the hooks inherit. Only the first level under the folder is counted, so a nested archive
  gives a lower bound. A project with neither relies on the commit threshold alone (`SKILL_RETRO_COMMITS`, default 8).
- The **state** (`<project>/.claude/.state/`) is per machine and keeps itself out of git with its own `.gitignore`;
  the project's `.gitignore` is never edited. `last-retrospective` holds the commit of the last retrospective (the
  skill writes it); with no baseline yet, the first stop records HEAD and says nothing.

## Tests

```bash
node --test skills/skill-retrospective/hooks/hooks.test.mjs
python -m unittest tests.test_skill_retrospective_skill
```
