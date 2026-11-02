# Savvy Flow

An orchestrated delivery flow. `/savvy-flow:savvy-flow <task>`: the session model plans, owns the design, delegates
the implementation to tiered worker subagents and reviews what they return adversarially.

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
| `SKILL.md` | The orchestrator's playbook: plan (tasks grouped by topic), design (never delegated), tiering, delegation (one persistent worker per topic, rotated by context size), adversarial review, close; a host's own task list, turn summary and sessions run alongside it. |
| `agents/savvy-fable.md` | Fable / high: the hardest logic and bugs; a targeted design feature only on request. |
| `agents/savvy-heavy.md` | Opus / xhigh: unfamiliar code, unclear root cause. |
| `agents/savvy-careful.md` | Opus / high: delicate but well-understood changes. |
| `agents/savvy-medium.md` | Sonnet / medium, lean tools: standard feature work. |
| `agents/savvy-light.md` | Sonnet / low, lean tools: mechanical edits, builds, tests. |
| `LICENSE` | The upstream MIT licence. |

`savvy-fable` runs on the Fable model (`model: fable` in its file). Every worker denies the host app's task-list and
session tools (`disallowedTools: [mcp__ccd_turn, mcp__ccd_session]`): it reports to the orchestrator only. Where the
host has no such tools the deny does nothing. Light and Medium also carry a tool allowlist (`tools`: files, the shell,
`ToolSearch` and the savvy-progress tools): without the listing of every tool and skill a fresh worker starts at a
fraction of the context, so a task that needs a skill, a browser or the web goes to Careful or above.

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
