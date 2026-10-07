# Changelog

## [1.1.0] - 2026-10-07
- Installable as a Claude Code plugin: plugin-entry.json gives the plugin its /conductor:* commands


## [1.0.1] - 2026-07-01
- Publish Claude Code migration (retarget from Gemini CLI distribution)


All notable changes to the `conductor` skill are documented here.

## [1.0.0]

### Added
- Initial release: Claude Code adaptation of the Conductor Context-Driven Development workflow.
- Slash commands installed into `.claude/commands/conductor/`: `setup`, `new-track`,
  `implement`, `status`, `review`, `revert`.
- Bundled `conductor/` workspace templates (`index`, `product`, `product-guidelines`,
  `tech-stack`, `workflow`, `tracks`, `code_styleguides/general`).
- `post_install.py` hook that installs the commands and scaffolds the workspace without
  overwriting existing files.
