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
| `scripts/codex-status.mjs` | Bounded atomic status snapshots from JSON stdout and positioned rollout tails; no dependencies. |
| `scripts/gemini-status.mjs` | Bounded atomic status snapshots from `agy -p --output-format stream-json`; no dependencies. |
| `references/themes.md` | The chat themes, one section per month: each theme's window, its mascot per tier, the orchestrator's mark, the review marks and the closing line. The orchestrator reads the current month's section, or one theme's row. |
| `agents/savvy-fable.md` | Fable / high: plans only, on the user's yes for each launch. |
| `agents/savvy-heavy.md` | Opus / xhigh: unfamiliar code, unclear root cause. |
| `agents/savvy-careful.md` | Opus / high: delicate but well-understood changes. |
| `agents/savvy-medium.md` | Sonnet / medium, lean tools: standard feature work. |
| `agents/savvy-light.md` | Sonnet / low, lean tools: mechanical edits, builds, tests. |
| `agents/savvy-tools.md` | Sonnet / medium with the session's connected tools (MCP servers, apps): mechanical work through them from a recipe in the brief. |
| `agents/savvy-codex-luna.md` … `savvy-codex-astra.md` | Sonnet / low relays for the Codex CLI, one per OpenAI intensity (Luna, Terra, Sol, Astra): each picks the newest model of its family from Codex's model list, runs one task with `codex exec` (sandboxed), checks the diff and the tests, reports the Codex usage. |
| `agents/savvy-gemini-flash.md` … `savvy-gemini-carbon.md` | Sonnet / low relays for the Antigravity CLI (`agy`), one per Gemini intensity (Flash, Argon, Hydrogen, Carbon): each runs one task with `agy -p` (sandboxed, git state and, for a second opinion, every write and command denied by its settings), checks the refusals, the diff and the tests, reports the Gemini usage. |
| `LICENSE` | The upstream MIT licence. |

`savvy-fable` runs on the Fable model (`model: fable` in its file). Every worker denies the host app's task-list and
session tools (`disallowedTools: [mcp__ccd_turn, mcp__ccd_session]`): it reports to the orchestrator only. Where the
host has no such tools the deny does nothing. Light and Medium also carry a tool allowlist (`tools`: files, the shell,
`ToolSearch` and the savvy-progress tools): without the listing of every tool and skill a fresh worker starts at a
fraction of the context, so a task that needs a skill, a browser or the web goes to Careful or above.

## A strong orchestrator, cheap workers

The orchestrator is the session's own model, whichever the user selected (Fable on a Fable session, Opus on an Opus
one): the skill never switches it or proposes another. It keeps the plan, the design and the review, and delegates
every task. A
worker's model is pinned in its agent file; an Agent call of a type with no model of its own (`general-purpose`, a
fork) inherits the session's model and would run as the orchestrator, so the skill allows only the savvy types, and
built-in ones (Explore) with an explicit `model`. Audits, verification passes and other legwork get a tier like any
task. `savvy-fable` (like Codex Astra and Gemini Carbon) is for plans only and never starts on the orchestrator's choice alone: each launch
and resume needs the user's yes, recorded with the `decide` tool (savvy-progress refuses it otherwise); anything else
goes to Heavy unless the user asks for Fable. A model or an effort the user sets for some tasks wins
over the tier's: it goes in those tasks' Agent calls, in the plan and in the progress bar. An agent the project
requires (its own reviewer or auditor) runs as its own type and is a task of the plan like any other.

## Codex (OpenAI models)

With the Codex CLI installed and signed in (`codex login status`), the orchestrator gains four Codex tiers, one per
intensity: Luna (Light-sized work), Terra (Medium), Sol (Careful or Heavy, and second opinions) and Astra (plans
only, each launch on the user's yes). A relay `savvy-codex-<intensity>`
runs a task with `codex exec` (read-only for a second opinion, `codex exec review` for a diff, workspace-write for a
task in a tree nobody else writes; never `danger-full-access`), resumes the same Codex session for follow-ups, checks
the git diff and the tests itself, and reports Codex usage from its small status snapshot. Use it for a second opinion
from another model family, or to run work on OpenAI models. A Codex task is marked in the plan before it goes out: the
code goes to a second vendor. Without the CLI the tier simply does not exist.
Codex reads `AGENTS.md` and the project's `.agents/skills` on its own, but not Claude Code's skills or `CLAUDE.md`: the
brief names each `SKILL.md` a task needs by absolute path, and Codex follows it.

The relay sends `codex exec --json` stdout through the plugin's zero-dependency Node script
`scripts/codex-status.mjs <unique-name> [resolved-model]`, keeping `-o <last.md>` for the final answer and stderr
separate. It finds the savvy-flow root through `CLAUDE_PLUGIN_ROOT` when available, or the parent of its active
`agents/` directory in the plugin cache (`skills/savvy-flow` in a source checkout). Each invocation, including a
resume, declares a new safe `codexStatus` name through `step` without `done`. JSON events pass through to the relay's
log, while an atomic snapshot of at most 16 KiB in `~/.codex/savvy-status/<name>.json` updates about once a second.
It reports session id, model, running/done/failed, an actual action of at most 60 characters, cumulative usage,
optional plan windows and update time. EOF before completion records failure. A repeated name is rejected.

`turn.completed.usage` is added to the session's prior instrumented snapshots, so resumes keep a cumulative total
and savvy-progress counts that session once. Usage before instrumentation cannot be recovered. Cached input is
part of input; reasoning is part of output (and stays null when the stream omits its count). Once the session id is
known, the Node writer finds that session's rollout under `~/.codex/sessions/YYYY/MM/DD/`
by the id in its filename. It reads only the last 512 KiB with a positioned read at discovery, at most every 30 seconds
while running, and once more at completion. The last complete `turn_context` model and `token_count.rate_limits`
fill the snapshot even when JSON stdout omits them. `CODEX_HOME`, when set, replaces `~/.codex` for both writer
status files and rollout discovery. Missing metadata stays absent; no plan usage is inferred. The panel never reads
rollouts. The panel polls running snapshots at most once every three seconds, shows their current action, and keeps the row running while fresh Codex heartbeats arrive, even if the Claude relay has stopped. A running
snapshot older than 15 seconds stops overriding the relay's state. Command actions remove pwsh/powershell, cmd and
bash wrappers before their 60-character limit; startup error/warning items do not become actions before a turn starts.
All workers report concrete step notes ("reading CreatureProbe.cs", "running EditMode tests"), never "working".

The recorded local CLI probe and the separate documentation sample used by the tests are described in
[`scripts/fixtures/README.md`](scripts/fixtures/README.md).

## Gemini (Google models)

With the Antigravity CLI installed and signed in with a Google account (`agy models` exits 0; `agy` is looked up on
the PATH, then in `~/.local/bin`), the orchestrator gains four Gemini tiers, one per intensity: Flash
(`gemini-3.8-flash`, Light-sized work), Argon (`gemini-4-argon`, Medium), Hydrogen (`gemini-4-hydrogen`, Careful or
Heavy, and second opinions) and Carbon (`gemini-4-carbon`, plans only, each launch on the user's yes, recorded with
`decide` as for Fable and Codex Astra). Claude and Gemini share one plan the way Claude and Codex do: Claude
orchestrates, Claude workers and Gemini relays take tasks, and a second opinion comes from another family (Codex Sol
or Gemini Hydrogen, or both for a high-risk diff). Work moves to Gemini to spare the Claude limits only when the user
asks. A Gemini task is marked in the plan before it goes out: the code goes to another vendor.

A relay `savvy-gemini-<intensity>` runs
`agy -p "<prompt>" --model <slug> --effort <effort> --sandbox --settings <file> --output-format stream-json --print-timeout <N>m`.
Its settings deny the git commands that change state for a task, and every file write and shell command
(`write_file(*)`, `command(*)`) for a read-only second opinion; a follow-up adds `--conversation <id>`. It never
passes `--dangerously-skip-permissions` or `--mode auto`. A refused tool does not fail the run (exit 0, `SUCCESS`):
the relay reads the steps in `ERROR`, the result's `denied_actions` and stderr, then compares `git status` and `HEAD`
with the start and runs the brief's checks. Gemini reads `AGENTS.md`, `GEMINI.md` and `.agents/skills`, not Claude
Code's skills: the brief names each `SKILL.md` a task needs by absolute path. The stream goes through
`scripts/gemini-status.mjs <unique-name> [model]`, which passes it on to the relay's log and keeps a small snapshot in
`~/.gemini/savvy-status/<name>.json` (conversation id, model, state, current action, token usage cumulative per
conversation, plan windows). The plan windows come from `agy -p /usage --output-format json`, which calls no model:
the writer runs it once the stream ends and keeps its `command.data` as `rateLimits`. The rules are in
`references/gemini.md`; the recorded probes behind the tests are in `scripts/fixtures/README.md`.

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
own steps to the agents panel. Its budget summary paces the costly tiers against the plan's 5-hour and weekly
windows: while a family the user set to `within` has a projection that asks for their decision, its Agent calls at Fable, Heavy or Careful (Codex
Sol or Astra, Gemini Hydrogen or Carbon) are refused until the user's yes is recorded (`decide`, or `/savvy-budget <family> once`), valid until
the next reset. The default is the `pace` policy: a family nobody set refuses nothing for the budget, and the
orchestrator keeps every window at or under 100 % by re-tiering, and never asks (`/savvy-budget <family> within` opts
back into being asked). Without it those calls are skipped, and the pacing rules fall back to the host's plan usage.

## Tests

```bash
python -m unittest tests.test_savvy_flow_skill
node --test --test-isolation=none skills/savvy-flow/scripts/codex-status.test.mjs
node --test --test-isolation=none skills/savvy-flow/scripts/gemini-status.test.mjs
```
