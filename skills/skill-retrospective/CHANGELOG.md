# Changelog

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

