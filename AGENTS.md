# CLAUDE.md

This repository is skill-driven. When a task matches an installed repo-local skill, use that skill instead of handling the workflow manually.

## Mandatory Routing

- If the user asks to `publish`, `sync`, `republish`, or otherwise update `published/`, use `skill-publisher`.
- Do not edit `published/` manually to satisfy a publish request. Publish from `skills/` through the publisher flow.
- If a task involves skill installation, updates, or managed `.gitignore` behavior, use `skill-manager`.
- If a task involves changelog normalization or version-entry cleanup, use `changelog-manager` before publishing when needed.

## Gitignore Guardrail

- Never rewrite the full project `.gitignore` when working on `skill-manager`.
- Only add or replace the lines inside the `# >>> skill-manager managed workspace files >>>` and `# <<< skill-manager managed workspace files <<<` markers.
- Preserve all `.gitignore` content outside that managed block exactly as-is.
- If the current edit path would replace, truncate, regenerate, or otherwise rewrite the full `.gitignore`, stop and fix the implementation instead of touching the file.
- Before any commit or push involving installer or `skill-manager` changes, re-read `.gitignore` from disk and verify that non-`skill-manager` baseline content is still present.

## Usable Repo Skills

These repo-local skills are expected to be usable when their task type matches:

- `changelog-manager`
- `compliance-audit-angular`
- `compliance-audit-avalonia`
- `compliance-audit-csharp`
- `compliance-audit-orchestrator`
- `compliance-audit-scripts`
- `compliance-audit-verification-gates`
- `conductor-workflow-optimization`
- `pre-implementation-review`
- `review-optimization`
- `skill-manager`
- `skill-publisher`
- `skill-retrospective`
- `subagent-balancer`
- `subagent-balancer-api`
- `subagent-balancer-orchestrator`

## Claude Skills

- Every skill is a normal Claude Code skill installed to `.claude/skills/<name>/` as a full copy.
- Use `install.config.json` as the source of truth for installer-facing skill metadata (category only).
- Treat `.claude/skills/` entries created by `skill-manager` as managed installation artifacts, not as repo-owned source files.
- Do not rely on versioning generated installation files to prove coverage. Coverage must be verified by testing the installer flow that generates them.
- When adding a new skill, register it in `install.config.json` and update installer behavior and tests together.

## Documentation Sync

- `AGENTS.md` and `CLAUDE.md` are policy mirrors and must stay byte-for-byte identical.
- When updating one of these files, apply the same change to the other in the same task.
- Do not simplify by overwriting one file with an older copy if that would drop an existing rule. Merge forward and preserve all constraints already documented.

## Publish Expectations

- Treat `skills/` as the source of truth.
- Keep `skills/<skill>/metadata.json`, `CHANGELOG.md`, `README.md`, and `SKILL.md` aligned before publishing.
- Let the publish flow update metadata/changelog versions and copy to `published/`.
- Every published skill is also a Claude Code plugin: `.claude-plugin/marketplace.json` is generated from `install.config.json` and `published/` by `build_marketplace.py` (the publish flow runs it) — never edited by hand. A skill that needs hooks or commands as a plugin declares them in its own `plugin-entry.json`; one that cannot be a plugin sets `"plugin": false` in `install.config.json`.

## Skill Retrospective On This Repo

- This repository runs `skill-retrospective` on its own work: install it here like the other repo skills (`python install.py`, or `/skill-manager:install`), which wires its two hooks into `.claude/settings.local.json`.
- A lesson about a skill is written in `skills/<skill>/` and published with `skill-publisher` — never in an installed copy under `.claude/skills/`, which the next update overwrites.

## Audit Expectations

- If a task changes code and a compliance audit skill applies, route through the matching specialized audit or the orchestrator.
- Do not update audit rules inside `published/` directly; change the source skill and publish it.
