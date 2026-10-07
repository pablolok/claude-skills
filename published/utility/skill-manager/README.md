# Skill Manager

Manage and install official Claude skills from the global skills repository. Every skill installs as a real Claude skill under `.claude/skills/<name>/`.

## Features

- **Unified Launcher**: Use `manage.py` to choose between the installer and uninstaller from one shared entry point.
- **Interactive Installation**: Use `install.py` to select and install skills.
- **Interactive Uninstall**: Use `uninstall.py` to remove only the skills currently managed by `skill-manager`.
- **Update Checking**: Use `check_updates.py` to see if your installed skills are out of date.
- **Legacy Upgrade**: Automatically migrates projects from the old `.gemini/`/`.agents/`/`.codex/` layout to `.claude/skills/`.
- **Post-Installation Hooks**: Automatically executes `post_install.py` for project-specific setup.
- **Physical Copying**: Replaces legacy junctions with robust file copying for better version tracking.
- **Claude Code Integration**: Installing `skill-manager` adds a startup update hook and a project-local `/skill-manager:*` slash-command set.
- **Workspace Ignore Management**: Installing `skill-manager` updates the project `.gitignore` to ignore the generated Claude workspace files it adds, tracking only the exact managed skill folders.

## Usage

### Manage Skills
Run the shared launcher from your project's root:
```bash
python3 <path-to-repo>/manage.py
```

If your terminal is not already in the destination repo root, pass the target explicitly:
```bash
python3 <path-to-repo>/manage.py --target-project <path-to-project>
```

The launcher presents two flows:
- `install` opens `install.py` to add or update skills
- `uninstall` opens `uninstall.py` to remove managed skills

### Install/Update Skills Directly
Run the installer directly from your project's root:
```bash
python3 <path-to-repo>/install.py
```

If you need to install into a different repo than the current working directory:
```bash
python3 <path-to-repo>/install.py --target-project <path-to-project>
```

Installer UX modes:
- Default CLI behavior uses a richer terminal multi-select component when running in a real TTY, including an ASCII title and ANSI colors when supported.
- Use `python3 <path-to-repo>/install.py --simple` to force the lightweight numbered prompt.
- Use `--target-project <path>` or `--project-root <path>` to force the destination project root.
- When run against a project that still uses the old multi-tool layout, the installer migrates it to `.claude/skills/` before showing the selector.
- After a successful install, the CLI prints the exact target project path plus the managed `.claude/` and `skill-manager` integration paths it touched.

### Uninstall Skills Directly
Run the uninstaller directly from your project's root:
```bash
python3 <path-to-repo>/uninstall.py
```

If you need to uninstall from a different repo than the current working directory:
```bash
python3 <path-to-repo>/uninstall.py --target-project <path-to-project>
```

Uninstaller notes:
- It only shows skills currently tracked in `.claude/skill-manager-manifest.json`.
- It removes the managed skill directory from `.claude/skills/` (and cleans up any stale legacy copies).
- Use `--target-project <path>` or `--project-root <path>` to force the destination project root.
- On Windows, it safely removes legacy junction-based installs before falling back to recursive directory deletion, retrying briefly after transient file-lock failures.
- If one managed artifact cannot be removed, uninstall logs the failure, keeps that artifact registered, and continues cleaning up.
- It refreshes the managed block in `.gitignore` after removal.

### Check for Updates
Run the update checker from your project's root:
```bash
python3 <path-to-repo>/check_updates.py
```

### Claude Code Startup Hook
When `skill-manager` is installed into a project, its `post_install.py` hook adds a `SessionStart` hook to `<project>/.claude/settings.json`.

Behavior:
- On session start, the hook checks installed skills against the source skills repository used during installation.
- If updates are available, Claude shows a startup message telling you to run `/skill-manager:update`.

Expected settings change:
`<python>` is the interpreter that ran the install (`sys.executable`, forward slashes): `python3` is not used because it may be missing or a Microsoft Store stub on Windows.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"<python>\" .claude/skills/skill-manager/scripts/session_start_hook.py"
          }
        ]
      }
    ]
  }
}
```

### `/skill-manager:*` Slash Commands
Installing `skill-manager` also creates:
```text
<project>/.claude/commands/skill-manager/list.md
<project>/.claude/commands/skill-manager/install.md
<project>/.claude/commands/skill-manager/update.md
<project>/.claude/commands/skill-manager/uninstall.md
```

These commands are invoked as:
```text
/skill-manager:list
/skill-manager:install <category/skill> [more-skills]
/skill-manager:update
/skill-manager:uninstall <skill-name> [more-skills]
```

Each command is a Markdown file with a `description:` frontmatter line and a body that uses `$ARGUMENTS` and invokes the matching helper script through a bash line, e.g.:
```
!`"<python>" .claude/skills/skill-manager/scripts/install_skills.py $ARGUMENTS`
```

Restart Claude Code or start a new session after installing or updating so the new hook and commands are picked up.

Expected `.gitignore` block:
```gitignore
# >>> skill-manager managed workspace files >>>
# Ignore local Claude workspace commands generated by skill-manager
.claude/commands/skill-manager/
# Ignore local Claude workspace settings written by skill-manager
.claude/settings.json
# Ignore the local skill-manager installation manifest
.claude/skill-manager-manifest.json
# Ignore skill directories installed and managed by skill-manager
.claude/skills/skill-manager/
# <<< skill-manager managed workspace files <<<
```

`skill-manager` manages that block during install and update so the generated Claude workspace state stays local by default. If the block already exists, only the content inside the markers is replaced; the rest of the project's `.gitignore` is preserved.

### Legacy Upgrade
When run against a project that still uses the old multi-tool layout, `skill-manager`:
- moves `.gemini/skills/*`, `.agents/skills/*`, and `.codex/skills/*` into `.claude/skills/`
- moves `.gemini/skill-manager-manifest.json` to `.claude/skill-manager-manifest.json`
- migrates the `.gemini/settings.json` SessionStart hook into `.claude/settings.json`
- removes `.gemini/commands/` (replaced by `.claude/commands/skill-manager/*.md`)
- updates the managed `.gitignore` block to `.claude/` entries

The migration is idempotent and never clobbers newer `.claude/skills/<name>` content.

## Post-Installation Hooks

Skills can include a `post_install.py` script that runs after installation. This is commonly used by skills like `review-optimization` to inject protocol entries into `conductor/workflow.md`, or by `skill-manager` to configure Claude Code hooks and slash commands.
