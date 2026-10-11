# Savvy Progress

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the savvy-flow plugin, and
useful with any subagents. It holds no skill: the plugin is its hooks module alone.

Originally by johnnyvizz (github.com/johnnyvizz/claude-kit), MIT; imported from main on 2026-10-11. The licence and
its copyright notice are in `LICENSE` and stay with every copy of this folder.

## Installing

```bash
claude plugin marketplace add pablolok/claude-skills
claude plugin install savvy-progress@pablolok-skills --scope user
```

Restart the session afterwards. The mod is built on function hooks (`hooks/register.tsx`), an early-access Claude Code
API that may change between releases. It works only as a plugin: a managed copy leaves out `.claude-plugin/`, which
the mod needs.

## What it draws

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size that opens
  the panel. It appears once something reports progress (savvy-flow does) or a `savvy-*` worker starts.
- **Agents panel** (`/agents-info` toggles it): running, finished and planned subagents with model, effort, task
  progress, context, estimated cost and time. Each savvy tier animates its own figure; `prefers-reduced-motion` stops
  them.

## Tools it adds

- `mcp__savvy-progress__progress`: the orchestrator reports the plan, the phase and the accepted tasks.
- `mcp__savvy-progress__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report
  shows its context fill in grey instead.

The cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in
`hooks/register.tsx`), not a bill.

## Settings

`language`: `auto` (default), `en` or `ru`. `auto` follows Claude Code's `language` setting, then the system locale,
and falls back to English. Set it with `/plugin configure savvy-progress@pablolok-skills`, or
`claude plugin install savvy-progress@pablolok-skills --config language=en`.

## What it holds

| File | Role |
| :--- | :--- |
| `.claude-plugin/plugin.json` | The mod's own manifest: name, version (the publish keeps it equal to `metadata.json`), the `language` option, the types. |
| `hooks/hooks.json` | Names the hooks module. |
| `hooks/register.tsx` | The module: the two tools, `/agents-info`, the bar and the panel. |
| `types/index.d.ts` | Its `$.state` contract. |
| `plugin-entry.json` | `{"strict": true}`: the marketplace entry lets Claude Code read the mod's own manifest. |
| `LICENSE` | The upstream MIT licence. |

## Tests

```bash
python -m unittest tests.test_savvy_progress_skill
```
