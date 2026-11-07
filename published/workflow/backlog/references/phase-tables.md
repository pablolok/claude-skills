# Phase tables — multi-phase work

More than two named steps → one row per step:

| | state |
|---|---|
| **P1** parse the import file | ✅ — the old parser already read 6 of 11 columns, extended |
| **P2** dedupe against existing rows | ⏳ half done; the fuzzy match is missing |
| **P3** background job | ⛔ **dropped** — measured: the import takes 2 s, a job adds nothing |
| **P4** error report for the user | 📋 not started |

- The state carries its **evidence** (`✅ — what was learned`), not just a tick.
- A **dropped step STAYS, with the reason** — otherwise it is proposed again.
- `✅` done · `⏳` in progress (name what blocks it) · `⛔` dropped · `📋` not started. A step partly done is `⏳` with
  what is left, never `✅` with a count: `✅ 11 of 17` is read as done wherever the table is counted.
- **The dashboard counts a row only in this form**: the first cell opens with the name in bold (`**P1** …`) and the
  state cell opens with the mark. A plain name, or a state in words, makes the row invisible — the entry's bar stays
  empty however many steps are done. After editing a table, check it is read:
  `node <skill>/scripts/dashboard.mjs --json` lists the entry's `phases`.
- **The `phase-tables` gate** (`node <skill>/scripts/phase-tables.mjs`) reads every open entry's card and own docs:
  a numbered list of three or more top-level steps with no phase row it can read fails the gate for an entry in
  progress, and is listed (not a failure) for one not started — the table is due when the work starts.
- **A closed entry's phases still count** in the dashboard's share of phases done (from its history line or card and
  the docs that line links, archived ones included); there its rows neither `✅` nor `⛔` count as dropped, since a
  closed entry has no work left. Closing an entry never lowers the share.
- Edited in the same change that moves a step — **and every other row whose open item that change closed**: work
  recorded only on the row it was done under leaves the rows that listed it open stale, and the entry looks
  unclosable. The cell stays a short current state (done / open, with evidence); the story goes in the commit.
- **No table on a single-step entry** — ceremony teaches readers to skip the tables that matter.
