# Skill Retrospective

When a piece of work closes, what it taught goes back into the skills that served it — rewritten in place, pruned,
kept short — never appended as a lessons log. Two hooks make it happen without anyone having to remember.

## What gets installed

| File | Role |
|---|---|
| `SKILL.md` | The retrospective: evidence → rewrite each skill used → check → record. |
| `hooks/log-skill-use.mjs` | `PostToolUse` (matcher `Skill`): adds each skill run to `.claude/.state/skills-used.txt`, once. |
| `hooks/retrospective-hint.mjs` | `Stop`: holds the turn **once** (never with `stop_hook_active`) when, since the commit in `.claude/.state/last-retrospective`, a backlog entry was archived or `SKILL_RETRO_COMMITS` (default 8) commits piled up, and asks for the retrospective on the logged skills. |
| `hooks/state.mjs` | Project root (from `CLAUDE_PROJECT_DIR`, never the shell's cwd) and the state folder. |
| `post_install.py` / `pre_uninstall.py` | Wire / unwire the two hooks in `.claude/settings.local.json`, idempotently. |

## Requirements and conventions

- **Node** runs the hooks (it is there wherever Claude Code is, on Windows too — `python3` often is not).
- **git**: the hooks count commits; outside a repository they stay silent.
- The **archive trigger** follows a convention: a backlog entry is closed by moving its folder under
  `docs/implementations/archive/`. A project without that folder relies on the commit threshold alone.
- The **state** (`.claude/.state/`) is per machine and keeps itself out of git with its own `.gitignore`; the
  project's `.gitignore` is never edited. With no baseline yet, the first stop records HEAD and says nothing.
- The wiring lives in `.claude/settings.local.json`, so the project's committed `settings.json` is untouched.

## Tests

```bash
node --test skills/skill-retrospective/hooks/
python3 -m unittest tests.test_skill_retrospective_skill
```
