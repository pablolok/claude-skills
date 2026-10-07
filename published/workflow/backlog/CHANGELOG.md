# Changelog

## [1.1.2] - 2026-10-07
- The 1.1.1 changelog line quoted an entry id outside backticks, which check-doc-refs reports in a project that keeps the skill's files in git: quoted as code


## [1.1.1] - 2026-10-07
- History lines that carry the title inside the bold (`- **BKLG-085 — Title**`) close the entry (they read as phases); links with any URI scheme (mem:, vscode:) are not repo files; the bootstrap's first fetch is quiet


## [1.1.0] - 2026-10-07
- One reader of the registers for every gate (register.mjs): ## or ### entries, history one-liners, phases and whole cards; the project's field names and document words in .claude/backlog.json (fieldNames, words, architectureExclusions); new gates backlog-coherence and closed-defects, and related-docs (from three projects' versions); backlog-anchor --all reads the history once (minutes to seconds on large registers); bootstrap/backlog-gate.mjs runs a gate from CI or git hooks at a pinned version


## [1.0.0] - 2026-10-07
- First release: the backlog skill made generic — BACKLOG.md register, doc folders archived on close, the doc gates and the GitHub Issues mirror shipped as Node scripts inside the skill; project values in .claude/backlog.json, repo and branch read from git

