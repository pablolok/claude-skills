# Changelog

## [1.1.0] - 2026-10-25
- Modular instructions, project cadence and evidence-based verification


## [1.0.11] - 2026-10-20
- A shared function's contract change runs its callers' tests; no git stash in a shared working tree


## [1.0.10] - 2026-10-16
- Two sentences that repeated diff-self-review (reading the staged diff) now name it instead.


## [1.0.9] - 2026-10-14
- a change judged by a threshold does not move it; report under the old rule beside the new


## [1.0.8] - 2026-10-13
- Check that the type check covers test files; compile new tests once with a temporary config


## [1.0.7] - 2026-10-13
- A change aimed at one platform (phone browser, touch, on-screen keyboard) is verified on a simulator or device with that input


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

