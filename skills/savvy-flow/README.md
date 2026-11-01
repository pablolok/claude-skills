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

The orchestrator's chat messages wear the theme of the day, in the same windows as the savvy-progress panel: a holiday
while one is on (Christmas, the Befana, Carnival, Easter, Halloween), otherwise the season (spring, summer, autumn,
winter). Each theme has a mascot per tier (in summer 🪁 Fable, 🤿 Heavy, 🧴 Careful, 🍉 Medium, 🏄 Light), a mark of
the orchestrator's own that also opens the progress bar's title (🌞), marks for accepted, returned and escalated tasks,
and a closing line. Chat only: files, commits, briefs and task titles stay plain, and the user can ask to drop it.
With savvy-progress installed, the agents panel dresses its figures for the same themes, animated.

## With savvy-progress

The skill and the agents run fine alone. With the savvy-progress plugin of the same marketplace installed, the
orchestrator reports the plan and the accepted tasks to a progress bar above the prompt, and each worker reports its
own steps to the agents panel. Without it those calls are skipped.

## Tests

```bash
python -m unittest tests.test_savvy_flow_skill
```
