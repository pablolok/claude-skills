# Skill Retrospective

When a piece of work closes, what it taught goes back into the skills that served it — rewritten in place, pruned,
kept short — never appended as a lessons log. It runs once, at the end of a piece of work: the close step of the
`backlog` skill (an entry archived) and of `jira-workflow` (a parent ticket or a piece of work closed) invoke it. One
hook logs the skills the work used, so the retrospective knows which ones to rewrite.

## Installing

As a Claude Code plugin, at user scope (once per machine, every project):

```bash
claude plugin marketplace add pablolok/claude-skills
claude plugin install skill-retrospective@pablolok-skills --scope user
```

The plugin wires its hook itself (declared in `plugin-entry.json`): nothing is copied into a project and no settings
file is edited. The hook runs from the plugin cache and takes the project from `CLAUDE_PROJECT_DIR`, which Claude Code
sets for every hook; without it, it does nothing.

## What it holds

| File | Role |
|---|---|
| `SKILL.md` | The retrospective: evidence → rewrite each skill used → check → record. |
| `hooks/log-skill-use.mjs` | `PostToolUse` (matcher `Skill`): adds each skill run to `.claude/.state/skills-used.txt`, once. |
| `hooks/state.mjs` | The project root (`CLAUDE_PROJECT_DIR` alone: never the shell's cwd, never the hook's own folder) and the state folder. |
| `plugin-entry.json` | The hook, as the marketplace declares it for the plugin. |

## Requirements and conventions

- **Node** runs the hook (it is there wherever Claude Code is, on Windows too — `python3` often is not).
- **No hook holds a turn.** Up to 1.6 a `Stop` hook held the turn after an archived entry or every 8 commits; the
  retrospective is now asked for by the close of the work itself (the `backlog` and `jira-workflow` close steps), once.
- The **state** (`<project>/.claude/.state/`) is per machine and keeps itself out of git with its own `.gitignore`;
  the project's `.gitignore` is never edited. `last-retrospective` holds the commit of the last retrospective (the
  skill writes it); with none yet, the retrospective counts from the commit that opened the work.

## Tests

```bash
node --test skills/skill-retrospective/hooks/hooks.test.mjs
python -m unittest tests.test_skill_retrospective_skill
```
