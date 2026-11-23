# Changelog

## [2.3.1] - 2026-11-24
- In Antigravity a run with SAVVY_RELAY set (a relay's headless agy -p, whose hooks inherit its environment) gets no Stop hold and writes no state: the continue would drag the relay's task into a retrospective, as a live run showed.


## [2.3.0] - 2026-11-24
- Hooks also run in Google Antigravity: a root `hooks.json` (PostToolUse `read_file` and Stop) and an `--antigravity` mode in both scripts that reads Antigravity's camelCase payload, takes the project from `workspacePaths[0]` (never `CLAUDE_*`), counts a `read_file` of a `SKILL.md` as a skill use, and continues the stop with `{"decision":"continue","reason":...}`. The state files and the Claude Code behaviour are unchanged.


## [2.2.1] - 2026-11-15
- a project skill made a layer over a shared one keeps every rule the shared text does not state as strictly (each rule found in the shared skill before it is deleted) and says at its top that it wins where the two differ


## [2.2.0] - 2026-10-25
- Modular instructions, project cadence and evidence-based verification


## [2.1.0] - 2026-10-16
- The Stop hook is back: it holds the turn once after an archived backlog entry or SKILL_RETRO_COMMITS commits (default 8) since the last retrospective, so work tracked in no backlog or tracker still gets one; the close steps of backlog and jira-workflow keep invoking it. A retrospective runs at the end of each piece of work — a round accepted or rejected, the user correcting the method — never in the middle of a step.


## [2.0.0] - 2026-10-16
- The Stop hook that held the turn after an archived entry or every 8 commits is removed (with SKILL_RETRO_COMMITS and SKILL_RETRO_ARCHIVE_DIRS): the close steps of backlog and jira-workflow invoke the retrospective once, at the end of the work. The PostToolUse skill log stays.


## [1.6.1] - 2026-10-15
- transcript-signals --since filters a transcript's records by time: a resumed agent's earlier tasks drop out


## [1.6.0] - 2026-10-14
- evidence from the agents' transcripts: transcript-signals.mjs distils hook blocks, failed calls, repeated calls, edit churn and undone work per agent


## [1.5.3] - 2026-10-10
- A clone is looked for before concluding there is none (CLAUDE_SKILLS_REPO, or a local repository with the plugin's remote); no issue or pull request on a repository the person does not maintain unless asked, the lesson is reported instead; skills built into the host get no edit; a cause enters a skill only when the evidence shows it. The Stop hook's request says the same.


## [1.5.2] - 2026-10-09
- a hook started through a symbolic link runs instead of exiting silently (entry point compared as real paths)


## [1.5.1] - 2026-10-07
- The source rule names managed copies: a folder under .claude/skills that .claude/claude-skills.json lists is installed from the skill repository, like a plugin; never edited in place (its check fails), fixed at the source, then synced by the project.


## [1.5.0] - 2026-10-07
- The Stop hook's archive trigger reads the project's backlog docsDir (.claude/backlog.json, archive = <docsDir>/archive) when SKILL_RETRO_ARCHIVE_DIRS is not set; the default stays docs/implementations/archive.


## [1.4.0] - 2026-10-07
- Commits follow the conventions of the repository they land in (language, subject form and length, body), the fixed subject only as the fallback; a plugin's lesson goes to the skill repository the plugin comes from (its clone, or an issue there), also in the Stop hook's request


## [1.3.2] - 2026-10-07
- No person in it: the dated quotes became the rules they set; a shared skill (plugin or user-level) stays generic, no rule owned by someone; the human is 'the user'; the metadata description is the frontmatter's


## [1.3.1] - 2026-10-07
- the installer hooks are gone: it installs as a plugin; the hooks take the project from CLAUDE_PROJECT_DIR alone and, without it, do nothing


## [1.3.0] - 2026-10-07
- Edit a skill at its source: project, skill repository (with a local clone: publish, tag, push; without: an issue on the repository) or user-level


## [1.2.0] - 2026-10-07
- Installable as a Claude Code plugin: its two hooks declared once in plugin-entry.json (the plugin installs them; wiring.py reads them from there for skill-manager installs)


## [1.1.1] - 2026-10-07
- Hook tests ignore SKILL_RETRO_* variables inherited from the developer's environment


## [1.1.0] - 2026-10-07
- Archive folders configurable with SKILL_RETRO_ARCHIVE_DIRS (comma-separated, default docs/implementations/archive)


## [1.0.0] - 2026-10-06
- First release: the retrospective skill plus two Node hooks (skill log, stop hint) wired into settings.local.json on install and unwired on uninstall

