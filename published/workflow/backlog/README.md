# Backlog

The project's work tracked in a file it owns — `BACKLOG.md` for the open entries, `BACKLOG-HISTORY.md` for the
closed ones, one doc folder per substantial piece of work, archived when its entry closes — with the gates that keep
those documents honest and an optional two-way mirror to GitHub Issues.

## What gets installed

| File | Role |
|---|---|
| `SKILL.md` | The procedure: entry format, Status as a sentence, phase tables, pending ledgers, doc folders, `add` / `list` / `process` / `done`. |
| `scripts/check-doc-refs.mjs` | Gate: links, `file:line` pointers and backticked paths resolve; entries cited as `[[BKLG-NNN]]` (or the project's `citation` form); every activity folder claimed by an open entry. |
| `scripts/backlog-anchor.mjs` | Gate: an entry's declared architecture docs cite it, defect markers both ways (open → listed, closed → gone). |
| `scripts/architecture-shape.mjs` | Gate: every stable architecture doc has its open-defects and contributions sections, and an owner cell per defect. |
| `scripts/backlog-coherence.mjs` | Gate: an entry lives in one place — never open and closed at once, never twice in one register. |
| `scripts/closed-defects.mjs` | Gate: a defect row with a state says what the entry that closes it says (both directions). |
| `scripts/related-docs.mjs` | Not a gate (always exit 0): the live docs that cite the entry being worked on or name a file a change touched — a post-commit hook's job. |
| `scripts/next-id.mjs` | Not a gate: prints the next entry id — the highest one the backlog folder's documents claim (a card heading, a history line, an activity folder's name; nothing outside it), + 1; ids only mentioned above it are a warning on stderr. |
| `scripts/backlog-github-sync.mjs` | The GitHub Issues mirror (`upsert-issue`, `close-issue`, `sync-all`; dry-run unless `--execute`). |
| `scripts/dashboard.mjs` | Not a gate: the local dashboard (see [Dashboard](#dashboard)). Its pieces: `dashboard-board.mjs` (the board, pure), `dashboard-activity.mjs` (commits → entries), `dashboard-docs.mjs` (the documents tree and the path guard), `dashboard-server.mjs` (HTTP), `dashboard-ui/` (the page). |
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
| `fieldNames` | the English names | the project's name for an entry field the scripts read: `Status`, `Priority`, `Added`, `Manual`, `Architecture`, `Doc`, `Summary`, `Issue`; and for the history line's close fields, `Done` and `Obsolete` (no gate parses them: the skill writes the close line under the project's name, e.g. `"Done": "Chiusa"`) |
| `words` | English | the words the gates look for in the documents (below) |
| `citation` | `"wiki"` | how a document cites an entry (below) |
| `github` | English labels and comment | what the GitHub mirror writes, and the register's Status/Priority words (below) |

`citation` — `"wiki"` cites an entry as `[[BKLG-NNN]]`; `"bare"` cites it by the id alone (`BKLG-012`). A closed
choice rather than a pattern: a pattern that matches nothing would blind every gate without an error, and these are
the two forms registers use. One helper reads it for every gate (`citedEntries` in `docIndex.mjs`):

| rule | `wiki` | `bare` |
|---|---|---|
| what cites an entry (backlog-anchor, related-docs, the contributions section) | `[[BKLG-NNN]]` | a prose id, or `[[BKLG-NNN]]` |
| an owner cell (architecture-shape, closed-defects) | its `[[BKLG-NNN]]` | its ids |
| check-doc-refs rule 4 | a prose id is reported: write `[[BKLG-NNN]]` | does not apply — every prose id is a citation; the count is printed |
| never a citation in either form | a line opening with its own id (heading, history line), a code span or fence, a link's text, a URL, a path, a range (`BKLG-010/011`) | same |

`words` — a register written in another language names its sections and states in it:

| key | default | read by |
|---|---|---|
| `open` | `Open` | `BACKLOG.md`'s section of the open entries (`## Open`): the entries the gates and the mirror read, the doc folders an open entry claims |
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

`github` — what the mirror writes into the project's GitHub, and how it reads the register's values:

| key | default | what it changes |
|---|---|---|
| `labels` | the canonical names | the project's name for each label the mirror owns: `backlog`, `status:open` / `status:in-progress` / `status:blocked`, `priority:high` / `priority:medium` / `priority:low`, `feature` / `bug` / `analysis` / `diagnostic` (the type, from the doc folder) |
| `closeComment` | ``Resolved via the `backlog` skill — moved to BACKLOG-HISTORY.md.`` | the comment left on an issue `close-issue` closes |
| `statusWords` | none | the register's Status words, each mapped onto `open`, `in-progress` or `blocked` |
| `priorityWords` | none | the register's Priority words, each mapped onto `high`, `medium` or `low` |

The English words always count; a mapped word matches at the start of the value as a whole word, so a value may
carry a note after it (`alta — the core of it`, `in corso — step 2`). A Status or Priority value no word matches is
**reported** — a warning naming the entry and the value — never left silently without its label. The issue body's
footer line stays English.

```json
{
  "github": {
    "labels": { "priority:high": "priorità:alta", "priority:medium": "priorità:media", "priority:low": "priorità:bassa" },
    "closeComment": "Chiusa con la skill `backlog`: la voce è in BACKLOG-HISTORY.md.",
    "statusWords": { "aperta": "open", "in corso": "in-progress", "bloccata": "blocked" },
    "priorityWords": { "alta": "high", "media": "medium", "bassa": "low" }
  }
}
```

An unknown key or a value of the wrong shape stops the scripts with a message — a typo is never ignored silently.
The GitHub repo and branch are not configured: they come from git.

The registers' layout needs no configuration: an open entry is a `## BKLG-NNN — title` or `### BKLG-NNN — title`
heading; the history keeps one-liners (`- **BKLG-NNN** …`, optionally with a phase: `- **BKLG-077 F1** …`) or the
whole card with its heading.

**Fixed, on purpose**:
- **The `BKLG` prefix.** Every register parser matches it with no config in hand, and so do the issue titles, the
  scripts' arguments, commit messages and other tools' hooks: a configurable prefix would have to reach all of them at
  once, and one that missed would read zero entries while printing green.
- **The folder names** — `features`, `bugs`, `diagnostic`, `analysis` and `archive`. The folder ⟺ card rule, the
  mirror's type labels, the past-describing `archive/` (any path through one is not checked) and the
  skill-retrospective hook (another plugin, which reads `<docsDir>/archive`) all name them; a renamed activity folder
  would get no type label, and a renamed archive would be checked as live. The folders sit under `docsDir`, which is
  configurable.

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

## Dashboard

The same board in two places, both read-only and rebuilt from the register and `git log` each time — nothing is
stored, nothing to keep in sync.

**In Claude Code — the mod.** Installed as a plugin, `backlog` is a [mod](https://code.claude.com/docs/en/plugins/mods/overview)
(`hooks/hooks.json` → `hooks/backlog-mod.js`; Claude Code 2.1.287 or later, the terminal or the Desktop app's Code
tab). Type `/backlog-dashboard`: a pane opens beside the transcript (a wide fullscreen terminal) or above the prompt.

| key | does |
|---|---|
| `1`–`6` | Overview · In progress · Next · To verify · Documents · Activity |
| Tab / ↑ ↓, Enter | move between rows, open the focused one (an entry, a document, a link) |
| `b`, `r`, Esc | back, refresh (it also refreshes itself every minute while open), close |

The hooks module has no Node APIs: it runs `scripts/dashboard.mjs --json --root <session folder>` and draws the
snapshot, and reads documents with `$.fs.read`. Links inside a document are pressable where the terminal reports
clicks, and listed as rows under it for the keyboard. Its tests: `claude plugin test` in the skill's folder.
Developing it: `claude --plugin-dir <skill folder>` hot-reloads it; Claude Code then writes `.claude-plugin/types/`
and `tsconfig.json` there (git-ignored, never published).

**In a browser.**

```bash
node scripts/backlog-gate.mjs dashboard            # in a project with the launcher
node <skill>/scripts/dashboard.mjs [--port N] [--no-open]
```

A page on `http://127.0.0.1:4317/` (a free port if that one is taken; loopback only). It needs only Node; the page
loads `marked` and `DOMPurify` from jsDelivr to render markdown (offline, documents show as plain text). Its views:

- **Overview** — entries closed over all, phases done over all phases (dropped ones left out), in progress, not
  started, blocked, pending checks; the entries in progress (their Status note, phase bar, current phase, last
  commit), what comes next, the pending ledgers, recent commits, recent closes.
- **Entries** — every open entry, searchable, filtered by status and priority, grouped by any field the register has.
- **An entry** — its card rendered, its phases, its docs, what it waits on / unblocks / cites / is cited by, the
  commits naming it.
- **Documents** — every markdown file git keeps, grouped (register, work docs, architecture, archive, the rest);
  relative links and images resolve, entry ids link to their entry, a doc lists the entries that link it.
- **Activity** — the recent commits with the entries they name, and the closed lines.

What it reads, and how:

| shown | read from |
|---|---|
| status, priority | the entry's fields, in the project's words (`github.statusWords`, `github.priorityWords`) |
| phases | phase-table rows (`**P1** …` with a state cell opening with ✅ ⏳ 🔨 ⛔ 📋) in the card and in its own docs (not `archive/`) |
| waits on / unblocks | the ids a `blocked` Status cites |
| last touched | the newest commit whose **subject** names the id (an id only in the body is a mention) |
| next | not started, not blocked: what blocked entries wait on first, then priority, then the oldest `Added` — a hint; being cited is shown, not ranked (a tracker is cited by all it gathers) |

## Tests

```bash
node --test skills/backlog/scripts/*.test.mjs
python -m unittest tests.test_backlog_skill
```
