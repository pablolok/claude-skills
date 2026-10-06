# Changelog

## [1.6.16] - 2026-10-06
- The managed .gitignore block keeps the lines it already has (the file is shared by every clone, the manifest knows only this machine) and the file's line endings


## [1.6.15] - 2026-07-01
- Publish Claude Code migration (retarget from Gemini CLI distribution)


## [1.6.14] - 2026-04-14
- Move runtime_config.json to .agents/skills/skill-manager/


## [1.6.13] - 2026-04-14
- Route skill-manager registration from .gemini/skills to .agents/skills and update all script path references


## [1.6.12] - 2026-04-14
- Merge codex_bridge and copilot_bridge into agents_bridge targeting .agents/skills/
- Both OpenAI Codex CLI and GitHub Copilot CLI read .agents/skills/ per open agent skills standard
- Replace four-layer skill structure with three-layer: gemini, agents, claude
- Update SKILL.md sections 9-10: rename Codex Bridge Hygiene to Agents Bridge Hygiene, remove Copilot section

## [1.6.11] - 2026-03-29
- Add explicit target-project support and show install or uninstall target paths


## [1.6.10] - 2026-03-29
- Handle locked uninstall artifacts gracefully and retry Windows directory cleanup


## [1.6.9] - 2026-03-28
- Handle Windows junction cleanup during uninstall and manifest normalization


## [Unreleased]

## [1.6.8] - 2026-03-27
- Add reusable managed uninstall flow and tighten manifest handling


## [1.6.7] - 2026-03-27
- Generate fallback Codex bridges for eligible shared skills during install


## [1.6.6] - 2026-03-27
- Add installer scope catalog and gitignore guardrails


## [1.6.5] - 2026-03-27
- Add shared-vs-gemini-only installer catalog


## [1.6.4] - 2026-03-27
- Preserve gitignore content and track exact installed skill paths


## [1.6.4] - 2026-03-27
- Preserve existing `.gitignore` content outside the managed `skill-manager` block during installs and updates.
- Track exact Gemini, Codex, and Claude skill directories in `.gemini/skill-manager-manifest.json` and ignore only those installed paths instead of broad skill trees.
- Bootstrap exact managed-skill ignore entries from existing local skill folders when upgrading older installs without a manifest.

## [1.6.3] - 2026-03-27
- Refresh the managed gitignore block whenever Gemini skills, Codex bridges, or Claude reference skills are installed.


## [1.6.2] - 2026-03-27
- Expand the managed `.gitignore` block to ignore installed `.gemini/skills/` plus managed `.codex/skills/` and `.claude/skills/` companion artifacts.

## [1.6.1] - 2026-03-27
- Add generated Claude reference skill support so installs can create lightweight `.claude/skills/` entries alongside Gemini skills.
- Add `--with-claude` support to the installed `/skill-manager:install` helper and document the Claude reference-skill flow.

## [1.6.0] - 2026-03-25
- Ask whether to install supported Codex bridge wrappers during interactive installs.
- Add `--with-codex` support to the installed `/skill-manager:install` helper so Gemini skills and matching Codex bridges can be installed together.


## [1.5.4] - 2026-03-24
- Preserve existing Gemini tool settings during install so built-in tools like ask_user are not shadowed


## [1.5.3] - 2026-03-23
- Manage local Gemini workspace ignores during install and update


## [1.5.2] - 2026-03-23
- Add a managed `.gitignore` block for the local Gemini workspace files created by `skill-manager`
- Clarify for Codex users that only intentionally repo-owned `.codex/skills` bridges should be committed

## [1.5.1] - 2026-03-23
- Add Plan Mode policy support for skill-manager helper commands


## [1.5.0] - 2026-03-23
- Add a user-level Plan Mode policy at `~/.gemini/policies/skill-manager-plan-mode.toml` for `/skill-manager:*` helper commands
- Document the distinction between workspace `tools.core` allowlists and user-level Plan Mode policies
- Expand verification steps for blocked custom commands in Plan Mode

## [1.4.1] - 2026-03-23
- Allow Python shell execution for namespaced skill-manager commands

## [1.4.0] - 2026-03-23
- Add `run_shell_command(python)` to workspace `tools.core` during skill-manager install/update
- Document the expected workspace settings change for `/skill-manager:*` commands
- Expand trust and verification guidance for blocked custom-command shell execution

## [1.3.2] - 2026-03-23
- Add /skill-manager commands, fix runtime pathing, and document trust verification

## [1.3.1] - 2026-03-23
- Replace /skills:update with /skill-manager:* commands and fix runtime hook paths

## [1.3.0] - 2026-03-23
- Replace the misleading `/skills:update` custom command with a `/skill-manager:*` command namespace
- Add generated `list`, `install`, `update`, and `uninstall` commands during skill-manager install/update
- Fix the runtime config source-repo path so updates resolve the correct `published/` directory
- Update the startup hook message to tell users to run `/skill-manager:update`

## [1.2.0] - 2026-03-23
- Add a richer terminal multi-select installer UI for direct CLI use
- Keep a lightweight ask-user installer path for Gemini and programmatic integrations
- Add `--simple` to force the lightweight numbered prompt

## [1.1.1] - 2026-03-23
- Add Gemini startup update hook and /skills:update command

## [1.1.0] - 2026-03-23
- Added a real `post_install.py` hook for `skill-manager`
- Added project-local Gemini integration with a `SessionStart` update hook in `.gemini/settings.json`
- Added a `/skills:update` custom command in `.gemini/commands/skills/update.toml`
- Added runtime scripts so the installed `skill-manager` can check and apply updates using the source `gemini-skills` repository path captured at install time
- Clarified in docs that `/skills update` is not a built-in Gemini subcommand and that `/skills:update` is the supported custom command

## [1.0.1] - 2026-03-23
- Added documentation for `post_install.py` hooks
- Added documentation for `check_updates.py`
- Standardized update format: `[Update Available] <skill-name> (vX -> vY)`
- Improved version tracking and physical copying support

## [1.0.0] - 2026-03-23
- Initial release of the skill manager.
- Support for `SkillInstaller` and `SkillSelector`.
