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
- Edited in the same change that moves a step — **and every other row whose open item that change closed**: work
  recorded only on the row it was done under leaves the rows that listed it open stale, and the entry looks
  unclosable. The cell stays a short current state (done / open, with evidence); the story goes in the commit.
- **No table on a single-step entry** — ceremony teaches readers to skip the tables that matter.
