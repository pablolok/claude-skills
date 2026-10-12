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
| `SKILL.md` | The orchestrator's playbook: plan, design (never delegated), tiering, delegation (one persistent worker per topic, rotated by context size), adversarial review, close. |
| `agents/savvy-fable.md` | Fable / high: the hardest logic and bugs; a targeted design feature only on request. |
| `agents/savvy-heavy.md` | Opus / xhigh: unfamiliar code, unclear root cause. |
| `agents/savvy-careful.md` | Opus / high: delicate but well-understood changes. |
| `agents/savvy-medium.md` | Opus / medium: standard feature work. |
| `agents/savvy-light.md` | Opus / low: mechanical edits, builds, tests. |
| `LICENSE` | The upstream MIT licence. |

`savvy-fable` runs on the Fable model (`model: fable` in its file).

## With savvy-progress

The skill and the agents run fine alone. With the savvy-progress plugin of the same marketplace installed, the
orchestrator reports the plan and the accepted tasks to a progress bar above the prompt, and each worker reports its
own steps to the agents panel. Without it those calls are skipped.

## Tests

```bash
python -m unittest tests.test_savvy_flow_skill
```
