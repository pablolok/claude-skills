# Changelog

## [1.0.6] - 2026-10-13
- A change to shared data or configuration is verified on every view that reads it, each against an independent count from the store — never on a sample or on "shows a value"

## [1.0.5] - 2026-10-12
- a compile gate shows what it compiled: one that compiled nothing is not green


## [1.0.4] - 2026-10-11
- Patches applied with --3way --index land staged: read git diff --cached, check a clean second apply for duplicates


## [1.0.3] - 2026-10-11
- A timeout is read at the failure before it is raised; parallel changes are checked for their starting commit and re-read against the other writers of the data they read; a value crossing a constraint enforced elsewhere is tested against that constraint, not a chosen literal


## [1.0.2] - 2026-10-11
- A timeout red in an untouched file is re-run alone and with a longer timeout before it is called pre-existing


## [1.0.1] - 2026-10-10
- Evidence is the runner's totals read whole and compared with the suite's size; never through a pipe; every skip named.


## [1.0.0] - 2026-10-07
- First published version: the developer's live copy from ~/.claude/skills becomes a plugin here, the single source; the link to clean-code-standards made a name (a plugin holds one skill alone)

