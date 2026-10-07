# Claude Code Skills

A collection of custom skills for Claude Code to automate and enhance software engineering workflows.

## Recommended Workflow

For most users, we recommend installing the **Compliance Audit Orchestrator**. It automatically detects which specialized audit (C#, Scripts, Angular, or Avalonia UI) to run based on your project changes.

| Skill | Description |
| :--- | :--- |
| **[Compliance Audit Orchestrator](./skills/compliance-audit-orchestrator/)** | **[Recommended]** Smart dispatcher that determines the correct specialized audit (C#, Scripts, Angular, or Avalonia UI) to perform. |
| **[Pre-Implementation Review](./skills/pre-implementation-review/)** | Reuse-first planning skill that checks for existing abstractions and duplication risk before implementation starts. |
| **[Conductor](./skills/conductor/)** | Context-Driven Development workflow. Provides the `/conductor:*` commands for planning, tracking, and executing implementation phases. |
| **[Skill Retrospective](./skills/skill-retrospective/)** | When a piece of work closes, rewrites the skills it used in place with what it taught. Installs two hooks (Node) that log the skills used and ask for the retrospective after an archived backlog entry or 8 commits. |
| **[Review Backlog](./skills/review-backlog/)** | The periodic review of the backlog: run the gates, clean up what has rotted, close with ONE proposal of what to do next. Pairs with Backlog. |
| **[Backlog](./skills/backlog/)** | The project's work tracked in `BACKLOG.md`, one doc folder per substantial piece of work archived on close, with the doc gates and a two-way GitHub Issues mirror (Node scripts inside the skill; project values in `.claude/backlog.json`). |

## 🔌 Install as Claude Code plugins (no Python, works in cloud sessions)

The repository is a Claude Code plugin marketplace: every published skill is a plugin of its own, so nothing is
cloned and no Python runs.

```bash
claude plugin marketplace add pablolok/claude-skills   # once per machine
claude plugin install backlog@pablolok-skills          # any skill, by name
claude plugin update backlog@pablolok-skills           # later, for a new version
```

Inside a session the same goes through `/plugin`. For **Claude Code on the web / cloud sessions**, add the
repository as a plugin marketplace in claude.ai's settings (*Plugins & skills*): the account's plugins are synced
into every session. A team project can also declare it in its committed `.claude/settings.json`: whoever opens the
project in an interactive session is offered the plugins when they trust the folder (a headless `claude -p` run
installs nothing from it):

```json
{
  "extraKnownMarketplaces": {
    "pablolok-skills": { "source": { "source": "github", "repo": "pablolok/claude-skills" } }
  },
  "enabledPlugins": { "backlog@pablolok-skills": true }
}
```

What the plugin route does differently from `install.py`:

- A plugin skill is named `<plugin>:<skill>` (e.g. `backlog:backlog`); commands keep their names (`/conductor:setup`).
- Hooks and commands come with the plugin (`skill-retrospective`'s two hooks, `conductor`'s commands), declared by
  each skill in its own `plugin-entry.json`.
- Project scaffolding done by a `post_install.py` does **not** run: `conductor`'s workspace templates, and the step
  that `pre-implementation-review`, `review-optimization` and `conductor-workflow-optimization` add to
  `conductor/workflow.md`. Use `install.py` for those, or add the step by hand.
- `skill-manager` is not offered as a plugin: it is the Python installer itself.

The marketplace (`.claude-plugin/marketplace.json`) is generated from the published skills by
`python build_marketplace.py`, which every `automate_publish.py` run calls — never edited by hand.

## Specialized Skills

These are called automatically by the orchestrator but can also be invoked manually.

| Skill | Description |
| :--- | :--- |
| **[Compliance Audit (C#)](./skills/compliance-audit-csharp/)** | Specialized audit for C#/.NET architectural rigor. |
| **[Compliance Audit (Angular)](./skills/compliance-audit-angular/)** | Specialized audit for Angular UI reviews. |
| **[Compliance Audit (Avalonia UI)](./skills/compliance-audit-avalonia/)** | Specialized audit for Avalonia desktop UI reviews. |
| **[Compliance Audit (Scripts)](./skills/compliance-audit-scripts/)** | Specialized audit for automation and script-based projects. |

## Installation & Usage

1.  **Clone this repository** into your local projects directory.
2.  **Activate a Skill**: Use the Skill tool within Claude Code. We recommend activating `compliance-audit-orchestrator`.
3.  **Automatic Integration**: These skills are designed to integrate with the **Conductor** workflow and will automatically update `conductor/workflow.md` if it exists.

## Official 'Published' Skills

This repository provides a set of official, stable skills in the `published/` directory. These skills are categorized and ready for use in any project.

### Available Categories:
- **audit/**: Skills for code quality and compliance audits.
- **workflow/**: Skills for enhancing the Conductor workflow.
- **utility/**: General purpose utility skills.

## 🚀 Claude Code Integration (Recommended)

If you are using Claude Code, you can automate the entire installation process.

**How to use:**
1.  **Open Claude Code** in your project.
2.  **Run the installer command**: Invoke `/skill-manager:install`. Claude will read the installation instructions, scan the repository, and prompt you to select the skills you want.
3.  **Interactive Selection**: Claude uses AskUserQuestion to let you pick which skills to install or update.
4.  **Auto-Integration**: Claude will physically copy the skill files into your project (under `.claude/skills/`) and execute any `post_install.py` hooks automatically.

You can also point Claude at the instructions directly (replace `<path>` with the absolute path to where you cloned this repository):

> *"Read the installation instructions at `<path>/claude-install.md` and help me install the official skills."*

> [!TIP]
> **Versioning & Updates**: All skills include version tracking. You can check for updates by running `python <path>/check_updates.py` from your project's root.

> [!IMPORTANT]
> **Workspace Boundaries**: Claude Code may refuse to read files outside of your current project's workspace for security reasons. If you encounter this, add the skills folder to your session so Claude can read it, or use the **Manual Installation** method below.

## 🛠️ Manual Installation

If you prefer to manage skills manually from your terminal, run this command from your project's root:

```bash
python <path-to-claude-skills>/manage.py
```

The manager opens a small launcher UI first, then sends you to either:

- `install.py` to add or update managed skills
- `uninstall.py` to remove managed skills already tracked by `skill-manager`

If you go through the installer flow, it will guide you through interactive selection and handle copying/updating automatically. Skills install into `.claude/skills/`.

You can also run the installer directly:

```bash
python <path-to-claude-skills>/install.py
```

## Skill Scope Catalog

This repository includes a machine-readable installer catalog at [`install.config.json`](./install.config.json).

- `distribution: "shared"` means the skill is intended to be shared across AI-tool integrations.
- `supports.claude_reference` controls whether `skill-manager` should offer or generate companion Claude reference artifacts during install flows.

### 🔄 Checking for Updates

To check for newer versions of installed skills without running the full installer:

```bash
python <path-to-claude-skills>/check_updates.py
```

---
Created by [pablolok](https://github.com/pablolok)
