# The dashboard

The register's progress, what is in progress (phases, last commit), what comes next, the pending ledgers, recent
activity, and every document of the project readable and linked — read-only, rebuilt from the register and git each
time. Two ways to open it:

- **In Claude Code** (the plugin is a mod): the user types **`/backlog-dashboard`**; a pane opens in the session,
  driven by keys (1–6 views, Enter opens a row, `b` back, `r` refresh, Esc closes). Claude cannot open it: tell the
  user the command.
- **In a browser**: start `node <skill>/scripts/dashboard.mjs` **in the background** (in a project with the launcher:
  `node scripts/backlog-gate.mjs dashboard`; `--port N`, `--no-open`) and give the user the URL it prints.

Its "next" is a hint; the move is `review-backlog`'s. In a project with no register yet the pane says where one
would start (`/backlog add …` creates it; `docsDir` in **.claude/backlog.json** moves it) — a state, not an error; the
browser page refuses to start there.

**It shows only what the register writes in its own forms**: phase tables, pending ledgers, and the Status and
Priority words — words in the register's language count only once mapped (`github.statusWords`,
`github.priorityWords`; unmapped, every entry reads as having none). To show more of the project in it (a roadmap of
groups, the checks still owed), write it in those forms before building a second view: one phase per group in the
umbrella entry, that entry `in-progress` while it runs, a `## Pending verification` line per shipped change awaiting a
check. A table that restates another document's counts gets a check against that source, or it drifts.
