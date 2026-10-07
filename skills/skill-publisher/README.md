# Skill Publisher

Automate the synchronization between development `skills/` and official `published/` directories.

## Usage

### Publish a Skill
Use the `automate_publish.py` script from the repository root:

```bash
python automate_publish.py <skill-name> <category> "<summary>"
```

**Options:**
- `--bump`: `major`, `minor`, or `patch` (default: `patch`).
- `category`: the skill's folder under `published/`, the same as its `category` in `install.config.json`
  (`workflow` for every skill today).

## Automated Checklist
1. Bumps version in `skills/<skill-name>/metadata.json`.
2. Adds entry to `skills/<skill-name>/CHANGELOG.md`.
3. Copies all files to `published/<category>/<skill-name>`.
4. Regenerates the plugin marketplace (`.claude-plugin/marketplace.json`).
