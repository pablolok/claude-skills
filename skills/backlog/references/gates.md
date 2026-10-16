# The gates and the next id — in full

## Running the gates

Run each **plain, then read its exit code** — `node x.mjs | tail` reports `tail`'s status, and a failing gate reads
green. Read the **control counts** each prints: "0 broken" without "out of how many" is indistinguishable from
"didn't look".

| script | the question |
|---|---|
| `check-doc-refs.mjs` | links, `file:line` pointers and (in instructions) backticked paths point at something that exists; entries are cited as `[[BKLG-NNN]]` (a project citing bare ids has nothing to report here); every activity folder is claimed by an Open entry |
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
in another language declares them in **.claude/backlog.json** (`fieldNames`, `words` — `words.open` for its
`## Open` section — see the README), so the gates read them; a project that cites entries by the bare id declares
`"citation": "bare"`. Never rename a project's fields, sections or citations to suit the gates.

## The next id

**The next id**: `node <this skill's base directory>/scripts/next-id.mjs` prints it — the highest id the
register's own documents claim + 1 (the first entry is `BKLG-001`). An id is **claimed** by a card heading
(`## BKLG-NNN` / `### BKLG-NNN`), a history line (`- **BKLG-NNN**`) or an activity folder's name (a parallel
session may have created one before any card cites it) — not by every mention: a history line citing another
project's entry is a mention, and counting it once handed out a number past that project's ids. A mention outside
the backlog folder (a bridge doc, a copied plan) is not read at all. Read its control line (the highest claim, the
files read) and its warning: ids mentioned above the highest claim (`BKLG-200…207 mentioned but never claimed`)
are another project's, or a card never written — check before using the number.
