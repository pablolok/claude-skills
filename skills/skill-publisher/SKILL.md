---
name: skill-publisher
description: Use in the claude-skills repository to add, change, publish, tag and roll out a skill of the pablolok-skills plugin marketplace — the whole path from an edit in skills/<skill>/ to the plugin updated on every machine and project that uses it. Trigger on "publish", "sync", "republish", "new skill", "release a skill", or after a skill-retrospective edited a skill here.
---

# Skill Publisher

Each individual skill or bundle here is a plugin of the marketplace `pablolok-skills`. Its source is
`skills/<plugin>/`; what users install is `published/<category>/<plugin>/` (with its generated `.antigravity-plugin/plugin.json`, and for a plugin with
Claude-format agents a copy without `agents/` under `published-antigravity/<category>/<plugin>/`) and
`.claude-plugin/marketplace.json`, all written only by the scripts below. A change is done when the plugin users get has it — not when the source file is saved.

## 1. Edit the source

- Edit `skills/<skill>/` only: `SKILL.md`, `README.md`, `metadata.json`, `CHANGELOG.md`, and what the skill runs.
  Never `published/`, `published-antigravity/`, the marketplace, or an installed copy in a plugin cache (the next update overwrites it).
- **A skill is generic.** It serves every project and every person: no person's name, no rule owned by someone
  (the user wants…), no project names, paths or examples, no dated quotes — the rule and a one-line reason, neutral
  examples (a job, a record, a config), in English. `tests/test_skills_are_generic.py` fails otherwise. Anything
  project-specific belongs in that project (`.claude/skills`, `.claude/rules`).
- **The description** is the trigger: one line, ≤ 500 characters (claude.ai drops a longer one), the same text in the
  `SKILL.md` frontmatter and in `metadata.json`. No colon followed by a space inside it: strict YAML reads `: ` in
  an unquoted value as a nested key and rejects the frontmatter, and the tests' `frontmatter()` helper does not
  notice — write a dash (` — `) instead.
- **No link to another plugin's skill folder** (`../other/SKILL.md`): installed plugins have separate roots, so name
  the skill. Links within the same bundle must resolve inside that bundle.
- **Hooks or commands** a skill needs as a plugin are declared in its own `plugin-entry.json` (paths through
  `${CLAUDE_PLUGIN_ROOT}`); a hook finds the project through `CLAUDE_PROJECT_DIR`, never through its own folder.
- **A mod** (a plugin with a hooks module that draws panes or adds commands) keeps its `.claude-plugin/plugin.json`
  (the name, plus what a marketplace entry cannot carry, such as `userConfig` or `types`) and `hooks/hooks.json`
  (`"modules": [...]`) in the skill, and declares `{"strict": true}` in `plugin-entry.json`: under the default `strict: false` Claude Code refuses it at install ("conflicting manifests"),
  and a marketplace entry cannot carry `modules`. Check it installed, not only validated: a scratch local marketplace
  holding the published folder, `claude plugin install … --scope project` in a scratch repo, `claude plugin list
  --json` shows no `errors`, and its command answers under `claude -p` (from PowerShell: Git Bash turns `/name` into a
  path). Develop it with `claude --plugin-dir`; the `.claude-plugin/types/` and `tsconfig.json` Claude Code writes
  there are git-ignored and `automate_publish.py` skips them.
  A mod with no skill (no `SKILL.md`) is listed with `"skill": false` in `install.config.json`: its entry names no
  skills and its `metadata.json` holds the description. A `version` in a mod's `plugin.json` wins over the
  marketplace's, so a stale one hides every update: `automate_publish.py` moves it with `metadata.json`.
  An `Svg` is an image, never pressable: what must be pressed is a `Button` beside it. **Look at a drawing before
  publishing it**, on real data: a throwaway test with the real snapshot inlined (a test cannot import a file from
  outside the plugin) prints the `Svg` source; serve it from a local http server and look at it in the browser, in
  both colour schemes — the browser refuses `data:` URLs and shows a local file only as a static snapshot.
- **A launcher** a project copies (`bootstrap/<name>.mjs`, e.g. backlog's `backlog-gate.mjs`, mermaid's `mermaid.mjs`)
  pins the skill's version in its `VERSION` line: bump it to the new version **before** running
  `automate_publish.py` (a test checks) — the script copies the skill as it finds it, and has no copy-only run.

## 2. A new skill

1. Create `skills/<skill>/` with `SKILL.md`, `README.md` (short: what it is and how it works), `CHANGELOG.md` and a
   `metadata.json` at version `0.9.0` (name, version, description).
2. Register it in `install.config.json` (`{"category": "workflow"}`; the category is its folder under `published/`).
3. Add `tests/test_<skill>_skill.py` (the shared checks live in `tests/published_skill_checks.py`).
4. Publish with `--bump major`: 0.9.0 becomes 1.0.0.

**Bundles** group related skills in one plugin. Create `skills/<plugin>/` with README, CHANGELOG and metadata
(name, version, description ≤ 500 characters, `"kind": "bundle"`), and register
`{"category": "gamedev", "kind": "bundle"}` in `install.config.json`. Each skill lives in
`skills/<plugin>/skills/<skill>/SKILL.md`, with its own references/scripts. List the skills in the bundle README.
Bundled frontmatter uses flat, one-line YAML scalar fields: `name` matches the skill folder, and `description` is a
nonempty string ≤ 500 characters; plain strings, YAML single quotes and JSON double quotes are supported, with no
nested mappings, collections or block scalars. Unlike an individual plugin, the bundle metadata describes its area,
not one skill's trigger. Keep game development skills engine-agnostic, with Unity and Unreal notes where they differ.
Empty skeletons start at `0.1.0` with `skills/.gitkeep`: publishing fails before any bump until at least one skill
exists; marketplace generation skips unpublished empty skeletons with a message. Validation also runs on every
bundled skill when building the marketplace. Publish once per bundle, with one version/changelog and a
`<plugin>@<version>` tag; the copied `skills/` exposes `<plugin>:<skill>` names. Existing workflow plugins keep their
root `SKILL.md` layout.

A plugin imported from elsewhere keeps its upstream version (seed `metadata.json` one bump below it, e.g. `1.1.0` and
`--bump minor` for `1.2.0`) and its licence's terms: the upstream `LICENSE` in its folder and the attribution in its
README, never in `SKILL.md`.

## 3. Publish

```bash
python automate_publish.py <plugin> <category> "<summary>" --bump <patch|minor|major>
python -m unittest discover -s tests -p "test_*.py"
python build_marketplace.py --check
claude plugin validate .
agy plugin validate published/<category>/<plugin>   # non-strict, each published plugin; skip it when agy is missing
```

- **Bump**: patch for a fix or a lesson in an existing step, minor for a new step or a removed section, major for a
  change that breaks how projects use it (a launcher's command, a hook's contract).
- `automate_publish.py` bumps `metadata.json`, adds the summary to `CHANGELOG.md`, copies the plugin to `published/`
  and regenerates the marketplace. Several skills: run it once per skill, then the checks once. With several new
  skills registered at once, every run but the last exits 2 (`no published skill at …` for one not copied yet):
  that is expected, so separate the runs with `;`, not `&&`, and judge the last run and the checks.
  **Run it once per version**: every run bumps again, so a second run leaves a version nobody released and a launcher
  that disagrees with `metadata.json`. When a check fails after the run, fix the source, restore only what the flow
  generated (`git checkout -- skills/<skill>/metadata.json skills/<skill>/CHANGELOG.md published/<category>/<skill>
  .claude-plugin/marketplace.json`), delete the published files that were new, and run it again.
- `claude plugin validate .` checks the marketplace with every plugin in it. Never validate a `strict: false`
  plugin's folder alone: its manifest is its marketplace entry, so the folder has none by design and the check fails
  with "No manifest found"; adding one would make the install refuse it. The warnings about a mod's `plugin.json`
  with no version or description are deliberate too: a version there would hide the marketplace's.
- `agy plugin validate` (Antigravity's CLI) is run **without `--strict`**: a mod's `hooks/hooks.json` always raises a
  warning there. A missing `agy` skips this step; it is not a failure. For a plugin with a `published-antigravity/` copy,
  validate that copy (the Claude folder carries no Antigravity manifest by design).
- Continue only on green. A skipped test is not a pass: the mermaid end-to-end test needs mermaid and jsdom
  installed — it finds them in `MERMAID_DEPS_DIR`, or in the launcher's cache under `CLAUDE_SKILLS_CACHE` after one
  `node scripts/mermaid.mjs check …` in any project.

## 4. Commit, tag, push

```bash
git commit -m "feat(<skill>): <version> — <what changed>"   # fix(...) / docs(...) / chore(...); several: feat(a, b): 1.1.0 / 1.0.1 — …
git fetch origin && git rebase origin/main                 # when main moved on GitHub: then the checks again
git push origin HEAD
python tag_published.py --push
```

- Others publish here too: fetch before the push. When `origin/main` moved, rebase onto it and run
  `build_marketplace.py --check` and the suite again on the rebased commit — both sides regenerate the marketplace,
  and a push of the old commit is refused anyway.
- The marketplace is read from `main` on GitHub: a commit not pushed is a version nobody gets.
- `tag_published.py` tags `<skill>@<version>` for every published version and, with `--push`, pushes every one origin
  lacks. Projects pin launchers by those tags; a launcher whose tag is missing cannot fetch its skill.

## 5. Roll it out

- **This machine**: `claude plugin marketplace update pablolok-skills`, then
  `claude plugin update <skill>@pablolok-skills` (first time: `claude plugin install <skill>@pablolok-skills
  --scope user`). An open session keeps what it loaded at start: the new version is there after a restart
  (`/compact` and `/reload-plugins` are not one). Install the new plugin before removing an old copy of the same
  skill, never the other way. `claude plugin list --json` has **one entry per scope and per project**: update each
  one that matters (`--scope user`, and the project's own by running the command in its folder without `--scope`,
  which otherwise can pick another project), and read the versions back from the list.
- **Antigravity** (`agy`; no marketplace): in a clone, `node bootstrap/antigravity-plugins.mjs` (on macOS
  `bootstrap/install-antigravity.command`) pulls and rewrites the entries of `~/.gemini/config/plugins.json` for
  `published/<category>/` and `published-antigravity/<category>/`; run it again after each publish, then restart `agy`.
  Use `--dry-run` to see the result first. It never runs `agy plugin install`.
- **claude.ai and the Desktop app**: the marketplace syncs from GitHub on its own; to force it, *Customize → Plugins
  → Add → Manage marketplaces → ⋮ → Check for updates*. A warning there (a description too long) means the plugin
  was synced without that part: fix it here and publish again. The Desktop app keeps **its own copy** of each
  plugin, apart from `~/.claude/plugins` (under `Claude-Data/<id>/rpm/…/plugin_*`, its `metadata.json` holds the
  version): the sync updates the marketplace, and the copy follows only after the app is quit from its tray icon and
  reopened. A mod's command in the Desktop app runs from that copy, so confirm the version there before testing it.
- **Projects on plugins**: a project declares the plugins it needs in its `.claude/settings.json`
  (`extraKnownMarketplaces` + `enabledPlugins`); whoever trusts the folder in an interactive session is offered them.
  A cloud session never shows that trust dialog, so it installs none of them, and a plugin floats with the
  marketplace. A project with a copied launcher pins a version: copy the new `bootstrap/<name>.mjs` over
  `scripts/<name>.mjs` when it should move to it, run it once, commit there.
- **Projects on managed copies** (shared or cloud projects): the project keeps this repository's
  `bootstrap/claude-skills.mjs` as `scripts/claude-skills.mjs`, and each skill byte for byte in
  `.claude/skills/<skill>/` from its tag, listed in `.claude/claude-skills.json`. To move it to the new version, run
  `node scripts/claude-skills.mjs sync <skill>@<version>` there and commit the diff it prints (the copy, the list,
  and the skill's launchers the project keeps in `scripts/`, which sync moves to the same version). Its CI or a hook
  may run `node scripts/claude-skills.mjs check`: it fails on a hand-edited copy, on a launcher that differs from the
  published one at the copy's version, or on a skill's hooks not wired in the project's settings (it prints the
  snippet), and reports newer versions as info.
  The tag must be pushed before a project can sync it.

## Environment

- `CLAUDE_SKILLS_REPO` — this clone's path; `skill-retrospective` edits and publishes skills here when it is set.
- `CLAUDE_SKILLS_CACHE` — where launchers keep the skills they fetch (and their npm dependencies); default
  `~/.cache/claude-skills`. Point it at a roomy disk.
