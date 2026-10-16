# GitHub Issues mirror (bidirectional, fail-soft)

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
- **The project's words**: a register whose Status or Priority values are in its own language maps them in
  **.claude/backlog.json** (`github.statusWords`, `github.priorityWords`); the label names and the close comment the
  mirror writes are `github.labels` and `github.closeComment` (see the README). A warning naming an entry and a value
  means that value maps to no label: add its word to the map — never rewrite the project's values to English.
- Commands (dry-run unless `--execute`; `--repo owner/name` overrides): `upsert-issue BKLG-NNN`,
  `close-issue BKLG-NNN`, `sync-all` (also reports issues to adopt and issues closed on GitHub whose entry is still
  open — the file move on close is never automated: run `done`).
- **Fail-soft**: a `gh` failure warns and **never blocks** the file update.
