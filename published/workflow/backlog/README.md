# Backlog

The project's work tracked in a file it owns — `BACKLOG.md` for the open entries, `BACKLOG-HISTORY.md` for the
closed ones, one doc folder per substantial piece of work, archived when its entry closes — with the gates that keep
those documents honest and an optional two-way mirror to GitHub Issues.

## What gets installed

| File | Role |
|---|---|
| `SKILL.md` | The procedure: entry format, Status as a sentence, phase tables, pending ledgers, doc folders, `add` / `list` / `process` / `done`. |
| `scripts/check-doc-refs.mjs` | Gate: links, `file:line` pointers and backticked paths resolve; entries cited as `[[BKLG-NNN]]`; every activity folder claimed by an open entry. |
| `scripts/backlog-anchor.mjs` | Gate: an entry's declared architecture docs cite it, defect markers both ways (open → listed, closed → gone). |
| `scripts/architecture-shape.mjs` | Gate: every stable architecture doc has `## Open defects` and `## Who worked on it`. |
| `scripts/backlog-github-sync.mjs` | The GitHub Issues mirror (`upsert-issue`, `close-issue`, `sync-all`; dry-run unless `--execute`). |
| `scripts/project.mjs`, `scripts/docIndex.mjs` | The project root and its config; the shared reference vocabulary. |
| `scripts/*.test.mjs` | The scripts' tests (`node --test`). |

## Requirements

- **Node** (18+) runs every script — no packages, no Python.
- **git**: the gates judge what git keeps; the mirror reads the repo from `origin`.
- **gh** (GitHub CLI), only for the mirror: `gh auth login` once, or `GH_TOKEN` in the environment.

## Project configuration (optional)

Everything has a default. A project that differs writes **.claude/backlog.json** at its root:

```json
{
  "docsDir": "docs/implementations",
  "architectureDir": "docs/architecture",
  "lineExtensions": ["gd", "shader"],
  "assetExtensions": ["prefab", "unity", "fbx"],
  "ignoreExtensions": ["meta"],
  "skipFolders": ["Library", "Temp"],
  "instructionPaths": ["docs/guides/"],
  "pastPaths": ["docs/implementations/DEPLOY-HISTORY.md"],
  "pathExceptions": { "local/settings.json": "each machine's own settings: git-ignored by design" }
}
```

| key | default | what it changes |
|---|---|---|
| `docsDir` | `docs/implementations` | where the two registers and the doc folders live |
| `architectureDir` | `docs/architecture` | the stable docs the `Architecture` field points at |
| `lineExtensions` | common text/code kinds | extra kinds a `path:line` pointer may name |
| `assetExtensions` | images, PDF | extra binary kinds a backticked path may name |
| `ignoreExtensions` | none | generated companion files left out of the index |
| `skipFolders` | `dist`, `build`, `out`, `bin`, `obj`, `coverage`, `target` | generated folders, used only outside a git work tree |
| `instructionPaths` | `CLAUDE.md`, `AGENTS.md`, `.claude/skills/`, the architecture folder | extra docs whose backticked paths must exist |
| `pastPaths` | `BACKLOG-HISTORY.md`, any `archive/` | extra docs that describe the past (not checked for citations or pointers) |
| `pathExceptions` | none | backticked paths that are legitimately not files of the repo, each with its reason |

An unknown key or a value of the wrong shape stops the scripts with a message — a typo is never ignored silently.
The GitHub repo and branch are not configured: they come from git.

What a project adds to the **procedure** (extra entry fields, its pending ledgers, how it verifies, whether the
GitHub mirror is on) goes in the preamble of its `BACKLOG.md` — the skill reads it first.

## Installing

- **Claude Code plugin** (no Python, works in cloud sessions): see the repository README —
  `claude plugin marketplace add pablolok/claude-skills`, then `claude plugin install backlog@pablolok-skills`.
- **skill-manager** (`python install.py`): copies the skill into `.claude/skills/backlog/`.

Either way the gates live in the skill, not in the project: a CI that runs them installs the skill first (or calls
the scripts from a checkout of this repository).

## Tests

```bash
node --test skills/backlog/scripts/*.test.mjs
python -m unittest tests.test_backlog_skill
```
