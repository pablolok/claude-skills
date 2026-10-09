# Changelog

## [1.5.2] - 2026-10-09
- next-id counts the ids the register CLAIMS (a card heading, a history line, an activity folder's name), not every mention: a history line citing another project's entries no longer hands out a number past them; mentions above the highest claim are a warning on stderr. Bootstrap VERSION 1.5.2.


## [1.5.1] - 2026-10-09
- a script started through a symbolic link runs instead of exiting silently with 0 (entry point compared as real paths, macOS and Windows); the mod loads again (a local const shadowed its register())


## [1.5.0] - 2026-10-09
- The plugin is a mod: /backlog-dashboard opens the dashboard in a Claude Code pane (overview, in progress, next, to verify, documents, activity; keys 1-6, Enter, b, r, Esc), drawn from dashboard.mjs --json; documents read in the pane with their links. Its own .claude-plugin/plugin.json and hooks/hooks.json, so its marketplace entry is strict (plugin-entry.json).


## [1.4.0] - 2026-10-09
- A local dashboard (dashboard.mjs): progress, the entries in progress with their phases and last commit, what comes next, the pending ledgers, recent activity, and every document readable and linked - rebuilt from the register and git on each refresh. canonicalField: the one reading of Status/Priority in the project's words.


## [1.3.1] - 2026-10-07
- Dead code removed: leadingKeyword, PRIORITY_LABELS and STATUS_LABELS, which nothing called since the labels follow the project's words. Bootstrap VERSION 1.3.1.


## [1.3.0] - 2026-10-07
- The scripts read the project's conventions instead of imposing fixed ones: citation (wiki [[BKLG-NNN]] by default, or bare ids) through one helper for every gate (bare: a prose id is a citation, rule 4 has nothing to report); words.open names the ## Open section; github.labels, github.closeComment, github.statusWords and github.priorityWords for the mirror, which matches a value's leading word past an emoji and warns on a Status/Priority value no word matches instead of leaving it unlabelled. The BKLG prefix and the folder names stay fixed, with the reasons in the README. Bootstrap VERSION 1.3.0.


## [1.2.0] - 2026-10-07
- Follows the project's conventions: the close line in the project's declared form (preamble, fieldNames.Done/Obsolete, or the history's own lines), commit messages in the project's format, field and section names the project's; new next-id script: the next id from the backlog folder's documents only (registers, activity folders, archive), also used by sync-all's adoption; bootstrap VERSION 1.2.0


## [1.1.5] - 2026-10-07
- The description fits 500 characters and is the metadata's too (it was 777 against a different 128-character summary); bootstrap VERSION 1.1.5


## [1.1.4] - 2026-10-07
- the README and the bootstrap no longer name the retired installer: the skill installs as a plugin


## [1.1.3] - 2026-10-07
- The preamble may link a conventions document beside the register when the rules outgrow it: the skill reads it too


## [1.1.2] - 2026-10-07
- The 1.1.1 changelog line quoted an entry id outside backticks, which check-doc-refs reports in a project that keeps the skill's files in git: quoted as code


## [1.1.1] - 2026-10-07
- History lines that carry the title inside the bold (`- **BKLG-085 — Title**`) close the entry (they read as phases); links with any URI scheme (mem:, vscode:) are not repo files; the bootstrap's first fetch is quiet


## [1.1.0] - 2026-10-07
- One reader of the registers for every gate (register.mjs): ## or ### entries, history one-liners, phases and whole cards; the project's field names and document words in .claude/backlog.json (fieldNames, words, architectureExclusions); new gates backlog-coherence and closed-defects, and related-docs (from three projects' versions); backlog-anchor --all reads the history once (minutes to seconds on large registers); bootstrap/backlog-gate.mjs runs a gate from CI or git hooks at a pinned version


## [1.0.0] - 2026-10-07
- First release: the backlog skill made generic — BACKLOG.md register, doc folders archived on close, the doc gates and the GitHub Issues mirror shipped as Node scripts inside the skill; project values in .claude/backlog.json, repo and branch read from git

