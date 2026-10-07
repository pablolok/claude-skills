# Claude Code Skills

pablolok's skills for Claude Code. The repository is a Claude Code plugin marketplace, `pablolok-skills`: every
skill is a plugin of its own, so a person installs any of them with Claude Code alone — no clone, no Python. A shared
or cloud project keeps managed copies instead (see below).

## Skills

| Skill | Description |
| :--- | :--- |
| **[Pre-Implementation Review](./skills/pre-implementation-review/)** | Before writing code, decide the right design — responsibilities, the pattern and owner of each, the seams; reuse and low duplication follow from it. |
| **[Skill Retrospective](./skills/skill-retrospective/)** | When a piece of work closes, rewrites the skills it used in place with what it taught. Two hooks (Node) log the skills used and ask for the retrospective after an archived backlog entry or 8 commits. |
| **[Backlog](./skills/backlog/)** | The project's work tracked in `BACKLOG.md`, one doc folder per substantial piece of work archived on close, with the doc gates and a two-way GitHub Issues mirror (Node scripts inside the skill; project values in `.claude/backlog.json`). |
| **[Review Backlog](./skills/review-backlog/)** | The periodic review of the backlog: run the gates, clean up what has rotted, close with ONE proposal of what to do next. Pairs with Backlog. |
| **[Clean-Code Standards](./skills/clean-code-standards/)** | The language-agnostic quality bar: single responsibility, injected collaborators, Tell-Don't-Ask, no god objects, no static business logic, strong typing, centralized literals, a reuse audit, fail-fast, no warning suppression. |
| **[C# / OOP Standards](./skills/csharp-oop-standards/)** | The C#/.NET layer on top of Clean-Code Standards: idioms, tooling and the coverage bar; the persistence stack is opt-in per project. |
| **[TypeScript / React Standards](./skills/typescript-react-standards/)** | The TypeScript, React and Node/Deno layer on top of Clean-Code Standards: idioms, tooling and quality gates. |
| **[Verification Gates](./skills/verification-gates/)** | Before handing work back: the required gates (tests, builds, compilers, linters, static analysis) are green on real evidence and nothing was silently removed. |
| **[Writing Architecture Docs](./skills/writing-architecture-docs/)** | The design doc of a piece of work and the stable "how it is now" doc of an area: three questions, the skeleton, nine rules, one diagram per question. |
| **[Mermaid Diagrams](./skills/mermaid-diagrams/)** | Mermaid diagrams that really render in the VS Code preview and on GitHub: when to pre-render to SVG, a validator and a renderer behind one stable project command (`node scripts/mermaid.mjs check` / `render`), the dead ends. |

## Two ways to use the skills

| | Plugins | Managed copies |
| :--- | :--- | :--- |
| For | one person, on their machines | a project shared by several people, or used in cloud sessions |
| Version | follows the marketplace (auto-updating) | pinned per skill, moved by a command, the diff reviewed in the project's history |
| Lives in | the plugin cache, per machine | the project's `.claude/skills/<skill>/`, committed; works offline |
| Start | `claude plugin install <skill>@pablolok-skills` ([Install](#install)) | copy [`bootstrap/claude-skills.mjs`](./bootstrap/claude-skills.mjs) to the project's `scripts/claude-skills.mjs`, then `node scripts/claude-skills.mjs sync <skill>@<version>` |

Plugins declared in a repository's `.claude/settings.json` are **not installed in Claude Code cloud sessions**: they
need the folder's trust dialog, which a cloud session never shows. They also float: a project cannot pin each
plugin's version. A managed copy is each skill copied byte for byte from its published tag `<skill>@<version>`,
listed in `.claude/claude-skills.json` (names only; the version is the copy's `metadata.json`) and never edited in
place:

```bash
node scripts/claude-skills.mjs sync backlog@1.3.0 review-backlog   # no version: the latest tag; prints the diff
node scripts/claude-skills.mjs check    # CI or a hook: exit 1 on a hand edit or a skill's hooks not wired
node scripts/claude-skills.mjs list
```

`check` prints the settings snippet for a skill whose hooks (its `plugin-entry.json`) are missing from the project's
`.claude/settings.json`, and reports newer published versions as info. A lesson about a managed skill still goes to
this repository (or an issue on it); the project takes it with a sync. Both ways coexist.

## Install

```bash
claude plugin marketplace add pablolok/claude-skills                 # once per machine
claude plugin install backlog@pablolok-skills                        # any skill, by name
claude plugin install backlog@pablolok-skills --scope project        # or for one project, in its settings
claude plugin update backlog@pablolok-skills                         # later, for a new version
```

`--scope user` (the default) makes a skill available in every project; `--scope project` records it in the
project's committed `.claude/settings.json`. Inside a session the same goes through `/plugin`.

- A plugin skill is named `<plugin>:<skill>` (e.g. `backlog:backlog`).
- Hooks and commands come with the plugin (`skill-retrospective`'s two hooks), declared by each skill in its own
  `plugin-entry.json`.
- For **Claude Code on the web / cloud sessions**, add the repository as a plugin marketplace in claude.ai's
  settings (*Plugins & skills*): the account's plugins are synced into every session.

A team project can also declare the marketplace in its committed `.claude/settings.json`: whoever opens the project
in an interactive session is offered the plugins when they trust the folder (a headless `claude -p` run installs
nothing from it):

```json
{
  "extraKnownMarketplaces": {
    "pablolok-skills": { "source": { "source": "github", "repo": "pablolok/claude-skills" } }
  },
  "enabledPlugins": { "backlog@pablolok-skills": true }
}
```

## Publish

`skills/<skill>/` is the source; `published/<category>/<skill>/` is what each plugin installs, written only by the
publish flow; `.claude-plugin/marketplace.json` is generated from `install.config.json` and `published/`.

```bash
python automate_publish.py <skill> <category> "<summary>" --bump <patch|minor|major>
python -m unittest discover -s tests -p "test_*.py"
python build_marketplace.py --check
claude plugin validate .
git commit ... && git push origin HEAD
python tag_published.py --push   # tags <skill>@<version>, pushes every tag origin lacks
```

Projects that run a skill's scripts outside Claude Code (CI, git hooks) pin the skill by its `<skill>@<version>`
tag. The whole path — the rules a skill must meet, a new skill, the roll-out to machines, claude.ai and projects —
is in [skills/skill-publisher](./skills/skill-publisher/SKILL.md).

---
Created by [pablolok](https://github.com/pablolok)
