---
name: backlog
description: Manage a project's tracked work in BACKLOG.md — add, list, process, close; AND the entry point when STARTING work that needs a design doc (spec, plan, report) — open a BKLG entry first, unasked, so its doc folder is tracked and archived. Ships the doc gates, a GitHub Issues mirror and a local dashboard. Trigger on "/backlog", "add to backlog", "metti nel backlog", "what's in the backlog", "backlog dashboard", "close BKLG-NNN", or before creating a features/bugs/diagnostic/analysis folder.
---

# Backlog

The backlog is a file in the repository: **`BACKLOG.md`** holds the open work, **`BACKLOG-HISTORY.md`** the closed
work (newest first), both in the project's backlog folder — `docs/implementations` unless the project's
**.claude/backlog.json** says otherwise (`docsDir`). Ids are `BKLG-NNN`. Read `BACKLOG.md` first, every time.

**This skill is also the entry-point when STARTING doc-worthy work.** Anything substantial enough for a folder
under `features/`, `bugs/`, `diagnostic/` or `analysis/` (a spec, a plan, a report) gets an entry **before** the
folder exists — even if nobody said "backlog". That keeps **every activity folder ⟺ an Open entry**, so it is
archived on close and never orphaned. Trivial work with no doc folder needs no entry.

## The project's own conventions

What differs between projects is written **in the project**, never in this skill:

- **The register's preamble** — the text at the top of `BACKLOG.md`, above its first `##` section — names the
  project's extra entry fields (what shipping needs: a deploy, a migration, assets, a manual step), its pending
  ledger(s), how it verifies work (build, tests, probes), its roadmap if entries point at one, and whether the
  GitHub mirror is on. Follow it; it wins over the defaults below. A project with no preamble uses the defaults —
  propose one the first time a project-specific need shows up. When the rules outgrow a few lines, the preamble
  keeps a short summary and links a conventions document beside the register: read it too, before the first change
  to the register.
- **.claude/backlog.json** — the values the gates read (folders, extra file kinds, exceptions, the project's
  field names and section words). Optional; see the skill's README.
- **What the register already says** — its existing entries, history lines and ledgers show the project's language,
  field names, date format and wording; its CLAUDE.md (or AGENTS.md) and recent `git log` show how it commits.

**Everything this skill writes into the project follows those conventions**: headings, field names and values,
ledger lines, the close line, doc titles, commit messages — in the project's language and form. The templates below
are the defaults for a project that declares none, never a correction to one that does.

The scripts live in this skill's `scripts` folder: run them as `node <this skill's base directory>/scripts/<name>.mjs`
from anywhere in the project (they find the project from `CLAUDE_PROJECT_DIR` or the git work tree). Node is the
only requirement.

## The entry format

```
## BKLG-NNN — <title>          (or ### — the project's register decides the level)
- **Status**: open | in-progress | blocked — <where it really stands>
- **Priority**: high | medium | low
- **Added**: YYYY-MM-DD
- **Manual**: no | yes (<what a person must do by hand>)
- **Architecture**: <doc.md>[#D<n>] — <what changes> | —
- **Doc**: <link to the detail doc> | —
- **Summary**: 1–2 lines — what's wrong/wanted + the gist of the fix.
```

Plus the project's fields from the preamble. The field names are the project's (`fieldNames`, or what its entries
use); the English ones above are the defaults. Each field on **its own line** (the gates and the mirror parse lines
that start with `- **Field**:`; a value appended after a `·` is not seen).

- **Manual**: anything the AI **cannot do** — an action in a tool only a person runs, a judgement, a login, a
  purchase. Before writing a step as Manual, check whether a connected tool (an MCP connector, a CLI already
  authenticated) can do it, or could once the person enables it — then the Manual part shrinks to the irreducible
  consent (a sign-in, an app authorization) and the rest is done for them. ⚠️ Write it **and say it** in the reply:
  a manual step only written down degrades into "nobody did it".
  Write it as the **path the person follows**, in the words on their screen (page › tab › the heading they look
  for), read from the UI's text — never a component's or file's name, which they cannot find; and say what to bring
  back (the numbers, a screenshot), so the step closes in one round.
- **Architecture** (only when the project keeps stable docs in `architectureDir`, default `docs/architecture`): the
  documents this work changes, then in prose what changes; `—` is a statement ("changes none"), not a blank. Never
  back-filled. Read `references/architecture.md` before writing it, before an entry that changes the system's shape,
  and before opening or closing an entry that carries a structural defect (`D<n>`).

### `Status` carries the INTERNAL state, not just the word

A sentence: the state, an em dash, where the work actually stands — what is left, what it waits on, whether it
can be picked up now.

```
- **Status**: in-progress — steps 1–3 done (commit `abc1234`); step 4, the retry path, is next
- **Status**: blocked — on [[BKLG-NNN]]: the new session model has to land first
- **Status**: in-progress — code done, tests green; waiting for a review (Manual)
```

- Updated **in the same change** that moved the state. What it waits on is **named and linked**.
- **Never flattering**: a Status that reads better than the entry is worse than none, because it gets believed.
- A bare `open` on an untouched entry is honest — no backfill campaigns.

### Multi-phase work carries a PHASE TABLE (in the Summary or the doc)

More than two named steps → one row per step, `| **P1** <step> | ✅ — <evidence> |`: the first cell opens with the
step's name in bold and the state cell opens with its mark (`✅` done · `⏳` in progress · `⛔` dropped, with the reason
· `📋` not started) — in any other form the dashboard does not count the row. A dropped step stays; a step partly
done is `⏳`. No table on a single-step entry. **Read `references/phase-tables.md` before writing or editing one.**

## Pending ledger — never lose an unverified (or undeployed) change

Work committed before it can be checked or shipped (a closed tool, a manual deploy, someone else's review) gets a line
in a `## Pending <kind>` section at the **top of `BACKLOG.md`**, above `## Open` — the kinds are the project's:

```
## Pending verification
Committed but NOT yet verified. Remove a line the moment its check passes.

- **Tests**: [[BKLG-NNN]] (commit `abc1234`) — the suite could not run here; run it
```

- Appended in the **same change** that commits the unchecked work. Never from memory.
- **Removed** as soon as the check passes (empty → `Nothing pending.`); no ✅ lines left behind.
- A check that **fails** is not removed: it becomes the entry's Status.
- A check that can only pass **after a step the person owns** (a scanner that reads only the default branch, a
  deploy from it, a merge they decide) keeps its line and the entry open even when asked to close first: say so in
  the reply, report what can be measured now as a prediction, and close once the check passes.
- Read on session resume and before closing any entry.

⚠️ Inside `BACKLOG.md` every mention of an entry other than its own heading is a citation — `[[BKLG-NNN]]`, or the
bare id in a project that declares `"citation": "bare"`.

## Doc folder — where the detail doc lives (by type)

| Entry type | Folder | File |
|---|---|---|
| Bug / deferred fix | `bugs/<name>/` | `plan.md` |
| Feature / system / content | `features/<name>/` | `spec.md` (+ `plan.md` only if needed) |
| Research / feasibility / tool evaluation | `analysis/<name>/` | `report.md` |
| Investigation / root cause | `diagnostic/<name>/` | `report.md` |
| **Closed / superseded** | `archive/` | the moved folder |

- `<name>` is a short kebab-case slug, in the backlog folder; create the type folder with its first entry.
- **The table names the place, not the number of files**: a second file exists only when it answers a question
  the first doesn't. A file created because a table mentions it is born empty.
- **When to create a doc**: a multi-step plan, cross-file changes, or a spec. A genuine one-liner stays inline
  (`- **Doc**: —`); if it grows, create the doc and update the field.

## GitHub Issues mirror and dashboard

- **The mirror** (`backlog-github-sync.mjs`, open entries ⇄ issues labelled `backlog`) is **on only when the project
  adopted it** — its preamble says so, or `backlog` issues already exist; never create it for a project that hasn't.
  When it is on, read `references/github-mirror.md` before the first backlog change of the session: it runs after
  every `add` / `process` / `done` / Status change. A `gh` failure warns and never blocks the file update.
- **The dashboard** is read-only: the user types `/backlog-dashboard` (Claude cannot open the pane), or Claude starts
  the browser page in the background. Read `references/dashboard.md` when asked for it, or when a table or ledger must
  show there — it counts only the register's own forms.

## The gates

Run each **plain, then read its exit code** (never through `| tail`, which reports its own status) and its **control
counts** ("0 broken" without "out of how many" is indistinguishable from "didn't look"). `check-doc-refs` and
`backlog-coherence` after every `add` and `done`; all of them — `backlog-anchor --all`, `architecture-shape`,
`closed-defects`, `related-docs` too — before closing an entry. A reference that is not a file of the repo goes in
`pathExceptions` **with its reason**, never by weakening a rule. Read `references/gates.md` for what each gate asks,
running them outside a session (CI, git hooks), a register in another language, and how the next id is chosen.

## add

1. **The next id**: `node <this skill's base directory>/scripts/next-id.mjs` prints it; read its control line and its
   warning before using the number (`references/gates.md`).
2. **Keep the entry lean** — the format's fields plus a 1–2 line Summary. Context, the real fix, acceptance and
   progress go in the **Doc**. From a one-liner, infer the rest from the code and the conversation and write a
   concrete plan — no placeholders. A temporary patch just shipped: its commit and why it isn't the real fix.
3. **Doc folder**: pick the type, create `<type>/<name>/<file>.md` in the backlog folder with the plan, link it
   from `- **Doc**:` — always a **file**, never the folder: the dashboard reads every Doc link as a file, and one
   folder link breaks the whole register (`EISDIR`). A shape change carries its target shape and acceptance from
   the start.
4. Insert the entry at the TOP of `## Open` (the project's `words.open`). Don't touch other entries.
5. Confirm the new id + one-line summary; **say the Manual step out loud**. Commit only in a commit flow or when
   asked, in the project's commit format (its CLAUDE.md or AGENTS.md, its recent `git log`); with none,
   `docs(backlog): add BKLG-NNN — <title>`.
6. Mirror (if on): `upsert-issue BKLG-NNN --execute`.

## list

The Open entries as a compact table: id · priority · status word · title · the project's key fields. The count,
the highest-priority item, anything in a pending ledger. Full entries only when asked (`/backlog show BKLG-NNN`).

## process BKLG-NNN (implement the real fix)

1. Read the entry and its Doc in full. Restate plan + acceptance in one line; confirm scope if it is large or
   ambiguous.
2. Status → `in-progress — <first step>`; mirror.
3. Implement with the project's own workflow (its CLAUDE.md, its planning and code-review skills). Keep Status and
   the phase table moving as steps land.
4. **Verify** the way the preamble / CLAUDE.md says (build, tests, probes, a look at the result). What cannot run
   now goes in the pending ledger in the same change.
5. Commit; a user-visible change also goes to the project's changelog if it keeps one.
6. **Close** — read `references/closing.md` and follow it: the entry leaves `## Open`, one history line in the
   project's declared form at the top of `BACKLOG-HISTORY.md`, the doc folder archived (check the filesystem, not just
   the entry), the declared `Architecture` updated, the mirror closed, the gates run. ⛔ Only when its pending lines
   are gone: an entry closes when the work is done **and verified**.
7. Tell the user what shipped, what is still pending, and any Manual step.
8. **Then run the `skill-retrospective` skill** on the work that closed (when it is installed): the skills the work
   used go back over what it taught. The archived entry is the end of a piece of work — the moment it is due.

## done / archive BKLG-NNN

The close of `process` (step 6, `references/closing.md`) and the retrospective of step 8, without implementing — for
work that landed by other means or became obsolete (the history line then carries the project's obsolete field
instead of its close field).

## Conventions

- One concern per entry, self-contained so it is actionable months later (file paths and the concrete change, not
  "fix the bug").
- Cite entries in documents in the project's form: `[[BKLG-NNN]]` by default — the form the gates read as a
  citation (`check-doc-refs` reports a bare id in a live document) — or the bare id when its config says
  `"citation": "bare"`. The entry's own heading `## BKLG-NNN — …` stays bare, and so does a history line's leading
  `- **BKLG-NNN**`.
- Newest at the top in both files. Never delete history — archive.
- Absolute dates (the session's current date).
