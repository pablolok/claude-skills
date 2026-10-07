---
name: skill-manager
description: Manage and install official Claude skills from the global skills repository.
---

# Skill Manager

This skill lets Claude manage official skills in the current project by driving the `manage.py`, `install.py`, and `uninstall.py` scripts from the global skills repository. Every skill installs as a real Claude skill under `.claude/skills/<name>/`.

## Usage

### 1. List Available Skills
First locate the skills repository on the user's machine.

**Search Pattern:** `**/install.py` (the repo also contains `manage.py` and a `published/` directory)

Once found, you can scan for skills:
```python
from install import SkillInstaller
installer = SkillInstaller("<path-to-repo>/published", ask_user_fn)
available = installer.get_available_skills()
```

For direct human CLI usage, prefer `python3 <path-to-repo>/manage.py` as the shared launcher entry point.
If the terminal is not already in the destination project root, pass `--target-project <path>` (or `--project-root <path>`) so installs and uninstalls mutate the intended repository instead of the current working directory.

### 2. Install Skills
To install a skill, use the `SkillInstaller` and `SkillSelector` logic.

```python
# 1. Ask user to select from 'available'
# 2. For each selected skill_path:
installer.install_skill(skill_path, os.getcwd())
```

Skills are copied in full to `.claude/skills/<name>/`.
For direct human CLI usage, `install.py` may use a richer terminal multi-select UI. For programmatic usage, keep using the lightweight `prompt_fn`-compatible flow (the AskUserQuestion-style dict interface) exposed by `SkillSelector` and `SkillInstaller`.
For direct CLI usage, the installer resolves the target project from `--target-project` / `--project-root` when present, otherwise from the current working directory, and prints the exact target path plus the managed `.claude/skills/` and skill-manager integration locations after a successful install.

### 2b. Uninstall Skills
To remove managed skills, use the `uninstall.py` entry point or the installed `/skill-manager:uninstall` command.

Rules:
- Only offer skills currently tracked as managed.
- Do not treat arbitrary local `.claude/skills/` folders as uninstall candidates.
- Reuse the existing uninstall runtime path instead of duplicating manifest or `.gitignore` refresh logic.
- For direct CLI usage, resolve the target project from `--target-project` / `--project-root` when present, otherwise from the current working directory, and print the exact target path so the user can verify where the uninstall is operating.
- If uninstalling one managed artifact raises an OS-level removal error, log it, keep that artifact registered, and continue instead of crashing the whole uninstall flow.

### 3. Check for Updates
To check if installed skills have newer versions available in the global repository:

```python
updates = installer.check_for_updates(os.getcwd())
if updates:
    # Notify user about available updates
    # Each item in 'updates' has: name, installed, latest, rel_path
```

### 4. Update Skills
To update a skill, simply reinstall it. The installer overwrites existing files and cleans up legacy junctions.

```python
for update in updates:
    installer.install_skill(update['rel_path'], os.getcwd())
```

### 5. Post-Installation Hooks (`post_install.py`)
Skills can include a `post_install.py` script that `SkillInstaller` runs automatically after copying files into the project. Use this hook for:
- Injecting project-specific protocol entries into `conductor/workflow.md`.
- Modifying local configuration (e.g., updating `.gitignore`).
- Configuring Claude Code project-local startup hooks and slash commands.

### 6. Checking for Updates (CLI)
A standalone `check_updates.py` script is available for non-interactive update checks:
```bash
python3 <path-to-repo>/check_updates.py
```
It displays available updates as: `[Update Available] <skill-name> (vX -> vY)`.

### 7. Legacy Upgrade
When the installer runs on a project that still uses the old multi-tool layout, it migrates automatically:
- `.gemini/skills/*`, `.agents/skills/*`, and `.codex/skills/*` are moved into `.claude/skills/`.
- `.gemini/skill-manager-manifest.json` is moved to `.claude/skill-manager-manifest.json`.
- The `.gemini/settings.json` SessionStart hook is migrated into `.claude/settings.json`.
- `.gemini/commands/` is removed (replaced by `.claude/commands/skill-manager/*.md`).
- The managed `.gitignore` block is updated from `.gemini/`/`.agents/` entries to `.claude/` entries.

Migration is idempotent and never clobbers newer `.claude/skills/<name>` content.

### 8. Claude Code Integration
Installing `skill-manager` configures two project-local Claude Code integration points:

- A `SessionStart` hook in `<project>/.claude/settings.json` that checks for updates when a session starts.
- A slash-command set under `<project>/.claude/commands/skill-manager/`, invoked as `/skill-manager:list`, `/skill-manager:install`, `/skill-manager:update`, and `/skill-manager:uninstall`.

The Claude Code SessionStart hook JSON is (`<python>` is the interpreter that ran the install (`sys.executable`, forward slashes): `python3` is not used because it may be missing or a Microsoft Store stub on Windows.):
```json
{"hooks": {"SessionStart": [{"matcher": "startup", "hooks": [{"type": "command", "command": "\"<python>\" .claude/skills/skill-manager/scripts/session_start_hook.py"}]}]}}
```

Slash commands are Markdown files with a `description:` frontmatter line and a body that uses `$ARGUMENTS` for arguments and invokes the helper script via a bash line, e.g.:
```
!`"<python>" .claude/skills/skill-manager/scripts/install_skills.py $ARGUMENTS`
```

Important:
- Custom `skill-manager` commands use the `/skill-manager:*` namespace.
- The installer maintains a small managed block in the project `.gitignore` for the artifacts it creates.
- That block ignores `.claude/commands/skill-manager/`, `.claude/settings.json`, `.claude/skill-manager-manifest.json`, and only the exact `.claude/skills/<skill>/` directories that were installed by `skill-manager`.
- If the managed block already exists, replace only the content between the markers and preserve the rest of the user's `.gitignore`.
- If `.claude/skill-manager-manifest.json` is missing, bootstrap exact skill entries from the existing local `.claude/skills/` directories before writing the managed block.
- Use `install.config.json` as the source of truth for a skill's category.
- Hard stop: never rewrite, regenerate, or replace the full `.gitignore` file to satisfy `skill-manager` behavior.
- Hard stop: if an edit path would touch anything outside the managed marker block, abort that path and fix the implementation instead.

### 9. Verification
If a user reports that the startup hook or `/skill-manager:*` commands do not work:

1. Verify `<project>/.claude/settings.json` exists and contains the SessionStart hook that runs `session_start_hook.py`.
2. Verify `<project>/.claude/commands/skill-manager/` exists with the generated `.md` command files.
3. Verify the project `.gitignore` contains the managed `skill-manager` block that ignores `.claude/commands/skill-manager/`, `.claude/settings.json`, `.claude/skill-manager-manifest.json`, and the exact installed `.claude/skills/<skill>/` directories.
4. Restart Claude Code or start a new session so newly generated hooks and commands are picked up.
5. Test with `/skill-manager:list`.

## Integration
This skill ensures that official skills are physically copied into `.claude/skills/` (replacing legacy junctions) to enable robust version tracking. It automatically triggers `post_install.py` hooks to maintain workflow consistency, including Claude Code update hooks and custom slash-command setup when the installed skill supports them.
