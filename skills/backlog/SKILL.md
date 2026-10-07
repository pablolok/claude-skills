---
name: backlog
description: Manage a project's tracked work in BACKLOG.md (default folder docs/implementations) — add/list/process/done deferred fixes, features and ideas, AND the entry-point when STARTING substantial work that warrants a design doc (a spec/plan/report — multi-step feature, planned bugfix, analysis, diagnostic): open a BKLG entry first, even if the user never said "backlog", so the doc folder is tracked and later archived. Ships the gates that keep the docs honest and a GitHub Issues mirror. Trigger on "/backlog", "add to backlog/todo", "metti nel backlog", "segnalo per dopo", "fix this later", "what's in the backlog", "cosa c'è nel backlog", "process BKLG-NNN", "close BKLG-NNN", revisiting a temporary patch — OR before creating any features/bugs/diagnostic/analysis doc folder.
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
- **.claude/backlog.json** — the values the gates read (folders, extra file kinds, exceptions). Optional; see
  the skill's README.

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

Plus the project's fields from the preamble. Each field on **its own line** (the gates and the mirror parse lines
that start with `- **Field**:`; a value appended after a `·` is not seen).

- **Manual**: anything the AI **cannot do** — an action in a tool only a person runs, a judgement, a login, a
  purchase. ⚠️ Write it **and say it** in the reply: a manual step only written down degrades into "nobody did it".
- **Architecture** (only when the project keeps stable docs in `architectureDir`, default `docs/architecture`):
  the documents this work changes, comma-separated, then in prose what changes. `—` is a statement ("changes
  none"), not a blank. It may carry a structural defect's marker (`billing.md#D3`), checked **both ways** by
  `backlog-anchor`: while the entry is open the defect **must** be among the doc's `## Open defects`; once closed it
  must be **gone** from there and one row `| [[BKLG-NNN]] | what it did |` must be in its `## Who worked on it`.
  ⚠️ **Never back-filled**: the field binds new work; a value deduced from memory for an old entry is invented.

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

More than two named steps → one row per step:

| | state |
|---|---|
| **P1** parse the import file | ✅ — the old parser already read 6 of 11 columns, extended |
| **P2** dedupe against existing rows | ⏳ half done; the fuzzy match is missing |
| **P3** background job | ⛔ **dropped** — measured: the import takes 2 s, a job adds nothing |
| **P4** error report for the user | 📋 not started |

- The state carries its **evidence** (`✅ — what was learned`), not just a tick.
- A **dropped step STAYS, with the reason** — otherwise it is proposed again.
- `✅` done · `⏳` in progress (name what blocks it) · `⛔` dropped · `📋` not started.
- Edited in the same change that moves a step — **and every other row whose open item that change closed**: work
  recorded only on the row it was done under leaves the rows that listed it open stale, and the entry looks
  unclosable. The cell stays a short current state (done / open, with evidence); the story goes in the commit.
- **No table on a single-step entry** — ceremony teaches readers to skip the tables that matter.

## Pending ledger — never lose an unverified (or undeployed) change

Work gets committed before it can be checked or shipped (the tests need a closed tool, a deploy is manual, a
playtest or a review is someone else's). A `## Pending <kind>` section at the **top of `BACKLOG.md`**, above
`## Open`, holds each such change — the kinds are the project's (verification, deploy, migration…):

```
## Pending verification
Committed but NOT yet verified. Remove a line the moment its check passes.

- **Tests**: [[BKLG-NNN]] (commit `abc1234`) — the suite could not run here; run it
- **Review**: [[BKLG-NNN]] — the new pricing copy (Manual: the product owner reads it)
```

- Appended in the **same change** that commits the unchecked work. Never from memory.
- **Removed** as soon as the check passes (empty → `Nothing pending.`); no ✅ lines left behind.
- A check that **fails** is not removed: it becomes the entry's Status.
- Read on session resume and before closing any entry.

⚠️ Inside `BACKLOG.md` every mention of an entry other than its own heading is a citation, `[[BKLG-NNN]]`.

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

### A change to the system's SHAPE is drawn, inside the activity's document

An entry that changes the shape of the system (a new module or layer, a new data flow, a structural defect) puts
in its own document: **how it is today** (a link to the stable doc in `architectureDir`, not a copy), **the shape
after** as a diagram (today next to tomorrow, sources in a `diagrams` folder beside the doc), **what is still
missing** and who closes it, and **acceptance written against the stable doc** ("updating that doc must produce
these changes"). Not an extra file beside the spec; not for a one-step entry or a point fix. If the touched area
has no stable doc yet, that is the moment to write it — coverage grows one activity at a time.

A **structural** defect (it comes back if patched where it shows) in an area with a stable doc gets a `D<n>` row
in that doc's `## Open defects`, its owner cell `[[BKLG-NNN]]`, **in the same commit that opens the entry**.
`architecture-shape` checks every stable doc has both sections and every defect an owner cell.

## GitHub Issues mirror (bidirectional, fail-soft)

`backlog-github-sync.mjs` mirrors the Open entries to issues labelled `backlog` on the project's GitHub repo
(read from `origin`; doc links point at origin's default branch), so collaborators can triage there.

- **On or off is the project's choice** — on when its preamble says so, or when `backlog` issues already exist.
  Never create the mirror for a project that hasn't adopted it. When on, run it with `--execute` after every
  `add` / `process` / `done` / Status change, and `sync-all --execute` at the start and end of backlog work.
- **Auth**: it only shells out to `gh` — `gh auth login` once per machine (a person runs it: suggest
  `! gh auth login`), or `GH_TOKEN` in the environment. Never write a token to disk.
- **Ownership**: the **file** owns the id, the doc link and the prose (an issue body that drifted is rewritten,
  announced as `BODY`); **GitHub** owns the lifecycle (open/closed, `status:*` / `priority:*` labels, assignee).
  Each side's drift is reported, not clobbered.
- Commands (dry-run unless `--execute`; `--repo owner/name` overrides): `upsert-issue BKLG-NNN`,
  `close-issue BKLG-NNN`, `sync-all` (also reports issues to adopt and issues closed on GitHub whose entry is still
  open — the file move on close is never automated: run `done`).
- **Fail-soft**: a `gh` failure warns and **never blocks** the file update.

## The gates

Run each **plain, then read its exit code** — `node x.mjs | tail` reports `tail`'s status, and a failing gate reads
green. Read the **control counts** each prints: "0 broken" without "out of how many" is indistinguishable from
"didn't look".

| script | the question |
|---|---|
| `check-doc-refs.mjs` | links, `file:line` pointers and (in instructions) backticked paths point at something that exists; entries are cited as `[[BKLG-NNN]]`; every activity folder is claimed by an Open entry |
| `backlog-anchor.mjs --all` | every entry's declared `Architecture` docs cite it, markers both ways |
| `architecture-shape.mjs` | every stable doc has its open-defects and contributions sections, and an owner cell per defect |
| `backlog-coherence.mjs` | an entry lives in one place: never open and closed at once, never twice in one register |
| `closed-defects.mjs` | a defect row with a state says what the entry that closes it says |
| `related-docs.mjs [HEAD]` | not a gate (always exit 0): the live docs that cite the entry or name a file a change touched |

Run `check-doc-refs` and `backlog-coherence` after every `add` and `done`; all the gates before closing an entry.
A legitimate reference to something that is not a file of the repo goes in `pathExceptions` **with its reason** —
never by weakening a rule. The gates are git-aware: they judge what git keeps, as a CI checkout would.

Outside a Claude session (CI, git hooks, package scripts) a project copies `bootstrap/backlog-gate.mjs` into its
repository: `node scripts/backlog-gate.mjs check-doc-refs` fetches this skill once at the version it pins and runs
the gate on the project.

**The register's language is the project's.** Entries may be `##` or `###` headings; the history may keep
one-liners, phases (`- **BKLG-077 F1**`) or whole cards. A register that names its fields or its document sections
in another language declares them in **.claude/backlog.json** (`fieldNames`, `words` — see the README), so the
gates read them; never rename a project's fields to suit the gates.

## add

1. **The highest id across ALL documents**, not just the cards — an id is also claimed by creating its folder, and
   a parallel session may have taken one: search the whole repository for `BKLG-` followed by three digits (e.g.
   `git grep -hoE "BKLG-[0-9]{3}" | sort -u | tail -1`), then NNN+1 (the first entry is `BKLG-001`).
2. **Keep the entry lean** — the format's fields plus a 1–2 line Summary. Context, the real fix, acceptance and
   progress go in the **Doc**. From a one-liner, infer the rest from the code and the conversation and write a
   concrete plan — no placeholders. A temporary patch just shipped: its commit and why it isn't the real fix.
3. **Doc folder**: pick the type, create `<type>/<name>/<file>.md` in the backlog folder with the plan, link it
   from `- **Doc**:`. A shape change carries its target shape and acceptance from the start.
4. Insert the entry at the TOP of `## Open`. Don't touch other entries.
5. Confirm the new id + one-line summary; **say the Manual step out loud**. Commit only in a commit flow or when
   asked (`docs(backlog): add BKLG-NNN — <title>`).
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
6. **Close**: remove the entry from `## Open`; add at the **top** of `BACKLOG-HISTORY.md`:
   ```
   - **BKLG-NNN** <title> — <what shipped, one line> · **Done**: YYYY-MM-DD (commit `<sha>`) · [doc](archive/<name>/<file>.md)
   ```
   ⛔ Only when its pending lines are gone: an entry closes when the work is done **and verified**.
7. **Archive the doc — check the filesystem, not just the entry**: `git mv <type>/<name> archive/<name>` (inside
   the backlog folder) and point the history line there — even if the entry's Doc is `—`: look in every type
   folder for one belonging to this item.
8. Declared `Architecture`: the `D<n>` leaves the doc's open defects, a row lands in `## Who worked on it`.
9. Mirror: `close-issue BKLG-NNN --execute`. Run the gates.
10. Tell the user what shipped, what is still pending, and any Manual step.

## done / archive BKLG-NNN

`process` steps 6–9 without implementing — for work that landed by other means or became obsolete (the history line
then says `**Obsolete**: <why>` instead of `**Done**`).

## Conventions

- One concern per entry, self-contained so it is actionable months later (file paths and the concrete change, not
  "fix the bug").
- Cite entries as `[[BKLG-NNN]]` in documents; the entry's own heading `## BKLG-NNN — …` stays bare, and so does a
  history line's leading `- **BKLG-NNN**`.
- Newest at the top in both files. Never delete history — archive.
- Absolute dates (the session's current date).
