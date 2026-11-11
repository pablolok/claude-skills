# Savvy Flow

An orchestrated delivery flow. `/savvy-flow:savvy-flow <task>`: the session model plans, owns the design, delegates
every task to tiered worker subagents, each pinned to its own model, and reviews what they return adversarially.

Originally by johnnyvizz (github.com/johnnyvizz/claude-kit), MIT; imported from main on 2026-10-11. The licence and
its copyright notice are in `LICENSE` and stay with every copy of this folder.

## Installing

```bash
claude plugin marketplace add pablolok/claude-skills
claude plugin install savvy-flow@pablolok-skills --scope user
```

Restart the session afterwards. Inside it the skill is `/savvy-flow:savvy-flow` (invoked by name only:
`disable-model-invocation`), the agents `savvy-flow:savvy-light` … `savvy-flow:savvy-fable`. The agents come with the
plugin (its `agents/` folder): a managed copy under `.claude/skills/savvy-flow/` carries the skill alone.

## What it holds

| File | Role |
| :--- | :--- |
| `SKILL.md` | The orchestrator's playbook: the model rule (every worker a savvy type, so none inherits the orchestrator's model), plan (tasks grouped by topic), design (never delegated), tiering, delegation (one persistent worker per topic, rotated by context size), adversarial review, close; a host's own task list, turn summary and sessions run alongside it. |
| `agents/savvy-fable.md` | Fable / high: the hardest logic and bugs; a targeted design feature only on request. |
| `agents/savvy-heavy.md` | Opus / xhigh: unfamiliar code, unclear root cause. |
| `agents/savvy-careful.md` | Opus / high: delicate but well-understood changes. |
| `agents/savvy-medium.md` | Sonnet / medium, lean tools: standard feature work. |
| `agents/savvy-light.md` | Sonnet / low, lean tools: mechanical edits, builds, tests. |
| `agents/savvy-codex-luna.md` … `savvy-codex-astra.md` | Sonnet / low relays for the Codex CLI, one per OpenAI intensity (Luna, Terra, Sol, Astra): each picks the newest model of its family from Codex's model list, runs one task with `codex exec` (sandboxed), checks the diff and the tests, reports the Codex usage. |
| `LICENSE` | The upstream MIT licence. |

`savvy-fable` runs on the Fable model (`model: fable` in its file). Every worker denies the host app's task-list and
session tools (`disallowedTools: [mcp__ccd_turn, mcp__ccd_session]`): it reports to the orchestrator only. Where the
host has no such tools the deny does nothing. Light and Medium also carry a tool allowlist (`tools`: files, the shell,
`ToolSearch` and the savvy-progress tools): without the listing of every tool and skill a fresh worker starts at a
fraction of the context, so a task that needs a skill, a browser or the web goes to Careful or above.

## A strong orchestrator, cheap workers

The orchestrator (Fable is the reference) keeps the plan, the design and the review, and delegates every task. A
worker's model is pinned in its agent file; an Agent call of a type with no model of its own (`general-purpose`, a
fork) inherits the session's model and would run as the orchestrator, so the skill allows only the savvy types, and
built-in ones (Explore) with an explicit `model`. Audits, verification passes and other legwork get a tier like any
task. `savvy-fable` never starts on the orchestrator's choice alone, whether it runs on Fable or Opus: for a task
that looks like Fable work (or one Heavy failed), the orchestrator asks the user first, with the reason, the cost and
its recommendation, and Heavy runs unless the user says Fable.

## Codex (OpenAI models)

With the Codex CLI installed and signed in (`codex login status`), the orchestrator gains four Codex tiers, one per
intensity: Luna (Light-sized work), Terra (Medium), Sol (Careful or Heavy, and second opinions) and Astra (Fable-sized,
only with the user's yes). A relay `savvy-codex-<intensity>`
runs a task with `codex exec` (read-only for a second opinion, `codex exec review` for a diff, workspace-write for a
task in a tree nobody else writes; never `danger-full-access`), resumes the same Codex session for follow-ups, checks
the git diff and the tests itself, and reports the Codex usage (5-hour and weekly windows). Use it for a second opinion
from another model family, or to run work on OpenAI models. A Codex task is marked in the plan before it goes out: the
code goes to a second vendor. Without the CLI the tier simply does not exist.
Codex reads `AGENTS.md` and the project's `.agents/skills` on its own, but not Claude Code's skills or `CLAUDE.md`: the
brief names each `SKILL.md` a task needs by absolute path, and Codex follows it.

## Themes

The orchestrator's chat messages wear the theme of the day, by the Italian calendar and in the same windows as the
savvy-progress panel: a holiday while one is on (from New Year's Day and the Befana to Republic Day, Ferragosto, All
Souls' Day — a sober one — and New Year's Eve), otherwise a period (Carnival, the Easter and summer holidays, the
sales, back to school, the Christmas season), otherwise the season (spring, summer, autumn, winter, from the 1st of
March, June, September and December). Each theme has a mascot per tier (in summer 🛟 Fable afloat, 🤿 Heavy diving, 🪣 Careful building a sandcastle, 🍉 Medium, 🏄 Light surfing), a mark of
the orchestrator's own that also opens the progress bar's title (🌞), marks for accepted, returned and escalated tasks,
and a closing line. Chat only: files, commits, briefs and task titles stay plain.
With savvy-progress installed, the agents panel dresses its figures for the same themes, animated.

The theme is chosen when the flow starts, the first that applies:

1. **Asked in chat** — "use the winter theme", "no theme": it holds for the rest of the session.
2. **The panel's `theme` option** — one setting for both. The orchestrator reads savvy-progress's `theme` with
   `claude plugin configure savvy-progress@pablolok-skills --json` (`inputs.theme`): a theme's id (`republic-day`,
   `winter`, …) pins it in chat too until `auto` is chosen again, `classic` keeps chat plain, `auto` follows the
   calendar. Set it with `/savvy-theme <theme|auto>`, the theme picker in the panel or `/config`: the panel redraws at
   once, and a flow under way switches chat from its next message.
3. **The calendar** — the holiday, period or season of the day.

## With savvy-progress

The skill and the agents run fine alone. With the savvy-progress plugin of the same marketplace installed, the
orchestrator reports the plan and the accepted tasks to a progress bar above the prompt, and each worker reports its
own steps to the agents panel. Without it those calls are skipped.

## Tests

```bash
python -m unittest tests.test_savvy_flow_skill
```
