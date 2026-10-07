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
| `scripts/architecture-shape.mjs` | Gate: every stable architecture doc has its open-defects and contributions sections, and an owner cell per defect. |
| `scripts/backlog-coherence.mjs` | Gate: an entry lives in one place — never open and closed at once, never twice in one register. |
| `scripts/closed-defects.mjs` | Gate: a defect row with a state says what the entry that closes it says (both directions). |
| `scripts/related-docs.mjs` | Not a gate (always exit 0): the live docs that cite the entry being worked on or name a file a change touched — a post-commit hook's job. |
| `scripts/backlog-github-sync.mjs` | The GitHub Issues mirror (`upsert-issue`, `close-issue`, `sync-all`; dry-run unless `--execute`). |
| `scripts/project.mjs`, `scripts/register.mjs`, `scripts/docIndex.mjs` | The project root and its config; what an entry looks like in the two registers; the shared reference vocabulary. |
| `scripts/*.test.mjs` | The scripts' tests (`node --test`). |
| `bootstrap/backlog-gate.mjs` | Copied into a project (not run from the skill): runs a gate from CI, git hooks or package scripts, fetching this skill once at the version it pins. |

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
| `architectureExclusions` | none (the folder's `README.md` is always left out) | architecture docs that have no defects of their own, each with its reason |
| `fieldNames` | the English names | the project's name for an entry field the scripts read: `Status`, `Priority`, `Added`, `Manual`, `Architecture`, `Doc`, `Summary`, `Issue` |
| `words` | English | the words the gates look for in the documents (below) |

`words` — a register written in another language names its sections and states in it:

| key | default | read by |
|---|---|---|
| `openDefects` / `contributions` / `owners` | `Open defects` / `Who worked on it` / `Defect owners` | the architecture docs' section titles |
| `ownerColumn` / `stateColumn` | `closed by` / `state` | defect table headings |
| `closed` | `closed`, `done`, `fixed` | a state cell that says closed (a ✅ always does) |
| `none` | `none`, `nobody` | an `Architecture` field declaring no doc, an owner cell naming nobody |
| `reopened` | `reopened` | a history line of a reopened entry (closed twice is then the history) |
| `retired` / `nonDefectHeadings` | `retired` / `limit`, `retired` | lines and tables that list defects which are not open |

An Italian register, for example:

```json
{
  "fieldNames": { "Architecture": "Architettura", "Priority": "Priorità" },
  "words": {
    "openDefects": "I difetti aperti", "contributions": "Chi ci ha lavorato", "owners": "Chi possiede ciascun difetto",
    "ownerColumn": "chi lo chiude", "stateColumn": "stato", "closed": ["chiuso", "chiusa"],
    "none": ["nessuno", "nessuna"], "reopened": ["riaperto"], "retired": ["ritirato", "ritirati"],
    "nonDefectHeadings": ["limite", "uscito", "usciti"]
  }
}
```

An unknown key or a value of the wrong shape stops the scripts with a message — a typo is never ignored silently.
The GitHub repo and branch are not configured: they come from git.

The registers' layout needs no configuration: an open entry is a `## BKLG-NNN — title` or `### BKLG-NNN — title`
heading; the history keeps one-liners (`- **BKLG-NNN** …`, optionally with a phase: `- **BKLG-077 F1** …`) or the
whole card with its heading.

What a project adds to the **procedure** (extra entry fields, its pending ledgers, how it verifies, whether the
GitHub mirror is on) goes in the preamble of its `BACKLOG.md` — the skill reads it first. Long rules go in a
conventions document beside the register, which the preamble links; the skill reads it too.

## Installing

As a Claude Code plugin (works in cloud sessions too): see the repository README —
`claude plugin marketplace add pablolok/claude-skills`, then `claude plugin install backlog@pablolok-skills`.

The gates live in the skill, not in the project. For CI, git hooks and package scripts, copy
`bootstrap/backlog-gate.mjs` into the project (e.g. into its `scripts` folder) and commit it: it is the one place
the project pins the skill's version (`VERSION`), and on first use it clones this repository's tag `backlog@<version>`
into `CLAUDE_SKILLS_CACHE` (default `~/.cache/claude-skills`), then reuses it offline.

```bash
node scripts/backlog-gate.mjs check-doc-refs
node scripts/backlog-gate.mjs backlog-anchor --all
node scripts/backlog-gate.mjs related-docs HEAD     # in a post-commit hook, with `|| true`
```

## Tests

```bash
node --test skills/backlog/scripts/*.test.mjs
python -m unittest tests.test_backlog_skill
```
