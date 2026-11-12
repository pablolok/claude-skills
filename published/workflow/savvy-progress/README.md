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

- **Progress bar**: the flow's title, phase, accepted tasks out of planned, and a button with the crew size (the
  panel's rows: running, finished and planned) that opens the panel. It appears once something reports progress
  (savvy-flow does) or a `savvy-*` worker starts. It says what the panel says: every agent the panel lists as running,
  of any type (a reviewer or a verifier outside the plan too), is counted beside the tasks (`Review 1/1 · 1 running`),
  and while one runs the bar stops at 99%, so every task accepted reads 100% only once nothing runs. The faint layer
  past the fill stays the plan's own workers, handed a task and not yet accepted.
- **Agents panel** (`/agents-info` toggles it): running, finished and planned subagents with model and version, effort, task
  progress, context, estimated cost and time. Each savvy tier animates its own figure; `prefers-reduced-motion` stops
  them.
  Claude runs name the resolved model the engine reports (for example `Opus 5.5 · xhigh`); a planned alias learns
  its version from the newest resolved run of that family in the session (an alias resolves to the newest, so a run
  pinned to an older model never relabels it) and keeps the bare alias until then. The
  engine exposes no API to resolve an arbitrary alias. Codex relays declare their exact model slug and reasoning
  effort through `step` (for example `Codex · Sol 6.1 · high`). Planned Codex tasks and runs awaiting that declaration
  predict the relay's choice from `~/.codex/models_cache.json` under the user's home: the visible (`list`) model
  ending in the family's suffix with the lowest priority. The cache is read at most once a minute; an absent or
  unreadable cache leaves the bare intensity (`Codex · Sol`); a re-read that finds the same models redraws nothing.
  A run awaiting its declaration predicts the effort too: Luna low, Terra medium, Sol high and Astra high. A planned
  Codex task names no effort (`Codex · Sol 6.1`): the user's effort for Codex is in its brief, which the bar never
  sees. Codex rows show their own session's cumulative tokens and estimated cost once the relay declares its
  `codexStatus` filename stem; an unavailable snapshot or price reads as `—`. The row uses the snapshot's concrete
  action as its step note. A fresh snapshot saying `running` keeps the row running after its Claude relay stops;
  once its heartbeat is older than 15 seconds, the next poll uses the relay's own state instead.
  A finished worker with declared but unfinished steps keeps its steps' ratio; it does not jump to a full bar.
  An answered turn whose engine roster still reports `running` or `waiting` stays live, with its bar capped at
  99%, until the roster confirms completion. This applies to every worker, including relays with no `codexStatus`.
  A waiting worker finishes when its roster becomes `idle` or `completed`, and fails if it becomes `failed` or
  `killed`; it need not issue another model request to update the panel.
  A resumed worker takes a new task title from SendMessage's `summary` and starts at round 1 for that title.
  This also works when SendMessage reuses an existing loop without `agent.spawn`: the queued title takes effect
  before that agent's next model turn, without renaming steps of its current turn.
- **Panel header**: plan usage appears at the top, with Claude and Codex side by side. Claude comes from the
  engine's `$.session.usage().rateLimits` (`five_hour`, `seven_day`) and follows `session.measure`. Codex comes only
  from the newest small `~/.codex/savvy-status/<name>.json` file's `rateLimits`; a family or window with no reading
  is omitted, and a family read alone (Claude without Codex) takes the whole row. A wide line shows each 5-hour/7-day percentage and its reset's local time (`↻02:00`). A narrow line
  uses `Claude 5h 41% · 7d 94% ↻02:00` (the reset at the end is the weekly one, or 5-hour if there is no weekly
  reading), then removes spaces to fit both families; at 40 columns it keeps both families' percentages and omits
  reset times. The line uses truncation rather than wrapping at still smaller widths.
- **Status snapshots**: savvy-flow ships the zero-dependency Node writer `scripts/codex-status.mjs`. Each relay picks
  a unique status name, declares it through `step` without changing its step count, and pipes `codex exec --json`
  through the writer. The writer atomically replaces a snapshot of at most 16 KiB about once a second, including a
  heartbeat during quiet commands, and flushes the terminal state on EOF. It keeps session id, resolved model,
  running/done/failed state, the last command/file/tool/reasoning action (at most 60 characters), cumulative token
  usage, optional rate limits and updated time. The Node writer finds the session's rollout by id and reads only its
  last 512 KiB with a positioned read at discovery, every 30 seconds while running, and at completion, to fill the model
  and rate limits. The engine never reads that rollout. Shell command actions show the inner command rather than
  pwsh/powershell, cmd or bash wrappers; pre-turn errors and warnings are ignored as actions. The panel lists only the flat `savvy-status` directory, polls running
  snapshots at most once every three seconds and rereads finished snapshots only when their modification time
  changes. It never reads Codex rollouts: the engine's `$.fs.read` rejects files larger than 4 MiB.
- **Family totals**: cost reads `Claude $x · Codex $y`, and tokens split the same way; the Codex part appears only
  when Codex is in use (a Codex worker in the list or a Codex plan reading), so a session without Codex shows Claude
  alone. Claude totals include all
  engine-reported subagent requests, including Codex's Claude relays. Claude cache reads contribute to cost and
  context but not to the token total. A writer adds each completed turn's `usage` to prior instrumented snapshots of
  the same session, including resumes under a new status name. The panel counts the largest cumulative snapshot
  once per session id. Work done before any status writer ran is unavailable. Codex tokens are `input_tokens +
  output_tokens`; cached input and reasoning are subsets, so neither is added again. A missing reasoning count is
  `null`, not guessed. Input, cached input and output are priced separately. Context fill remains the Claude relay's
  context. Missing status files contribute no Codex total until they can be read.
  Some CLI JSON streams omit `rate_limits`; the Node writer also reads them from the rollout tail. If neither source
  supplies them, `rateLimits` stays null and no Codex plan line appears. No usage or reset is inferred from tokens.
  Counts become available when the CLI emits turn usage.
- **Themes**: the figures dress up for the calendar, and every one of them moves, running or not (a running one at
  full pace, the others idling slowly); the bar takes the theme's colors and the panel's header an ornament of its
  own. The crab stays the crab, and each tier keeps its role in every theme: Fable is the rare one that floats or
  glides, Heavy digs and finds, Careful does the delicate work, Medium the everyday work, Light runs, Explore scouts;
  any other agent (and the bar) wears the theme's plain outfit.
  The calendar is Italian. A holiday wins over a period, a period over the season it falls in:
  - Holidays: New Year's Day (Jan 1: a wish on a shooting star, the new calendar, resolutions, lentils, the New Year's
    dip), the Befana (Jan 6: the patched kerchief, the broom, the sack of coal, the stocking of sweets), Valentine's
    Day (Feb 14: Cupid, chocolates, the love letter, roses, a heart balloon), Women's Day (Mar 8: mimosa), Father's
    Day (Mar 19: St Joseph the carpenter, a zeppola), Easter and Easter Monday (bunny ears, the egg hunt, a painted
    egg, a chocolate egg, a chick), Liberation Day (Apr 25: the flag flying, the partisan's red carnation, the
    laurel wreath), Labour Day (May 1: the concert, hard hat and pickaxe, the tailor, the picnic), Mother's Day (the
    second Sunday of May: the locket, breakfast in bed, the hand-made card, tulips), Republic Day (Jun 2: every figure
    waves the tricolour; the Frecce Tricolori, the bersagliere, the flag hoisted, a tricolour gelato, the band's
    drum), Ferragosto (Aug 15: the inflatable flamingo, the beach umbrella, skewers on the grill, pasta al forno, the
    beach ball, the fireworks), Halloween (Oct 31: vampire, skeleton, spider, bat, ghost, witch), All Saints' Day
    (Nov 1: halos, the procession candle, stained glass, the bell, the pilgrim), All Souls' Day (Nov 2, sober: muted
    tones and slow, gentle motion; a lantern, chrysanthemums, votive candles, white flowers), Black Friday (the day
    after the fourth Thursday of November: black and gold, the giant box, the card at the till, the laden cart), the
    Immaculate Conception (Dec 8: the tree and the nativity scene go up), Christmas Eve, Christmas Day, St Stephen's
    Day and New Year's Eve (Dec 24, 25, 26 and 31).
  - Periods: Carnival (the twelve days up to Shrove Tuesday: Venetian mask, Arlecchino, Pulcinella; confetti), the
    Easter holidays (Holy Thursday to Easter Tuesday: the trip out of town), the winter sales (Jan 7–20) and the
    summer sales (two weeks from the first Saturday of July: bags, tags and bargains), the summer holidays (Jul 1 –
    Aug 31: a hot-air balloon, the tent, sunscreen, the scooter), back to school (Sep 1–14: the mortarboard, the
    backpack, the pencil, the apple, a paper plane), the Christmas season (Dec 8 – Jan 6: angel, Santa, elf, baker,
    reindeer; snow falls).
  - Seasons, from the 1st of the month: spring (March: butterfly, digging the bed, a seedling, a kite; petals fall),
    summer (June: swim ring, snorkel, a sandcastle, watermelon, surfing), autumn (September: the wise owl, mushrooms,
    chestnuts, the grape harvest, raking leaves; leaves fall), winter (December: skating, ice fishing, knitting, hot
    cocoa, sledding; snow falls). Now and then in winter (a few seconds every half minute) a light flurry drifts down
    the panel's header too, in the band right of the flow's title, and settles on the tiles: drawn beneath the title,
    the ornament and the tiles, it never covers text or bars, and with `prefers-reduced-motion` it does not show.
- **Choosing the theme**: `/savvy-theme <theme>` (an id such as `republic-day`, or its Italian name such as
  `Festa della Repubblica` or `natale`) or the theme picker in the panel redraws the panel at once and keeps the pick
  in the `theme` option until `auto` is chosen; `/savvy-theme` alone lists every theme. A pick from the picker or from
  `/config` also leaves the session a note, so savvy-flow's chat follows it from its next message. The panel draws a
  copy of its values refreshed once a second, and while the picker has the focus the copy waits, so running agents do
  not redraw the open list back to its start, however often it is opened again and across the reload a pick causes; a
  pick, or the focus moving on (Esc, a click elsewhere), lets it catch up, and five minutes at most.
- **Housekeeping**: every few seconds while a run is shown as running, the mod checks it against the engine's own list
  of agent loops, so a worker that was killed, or lost to a reload or a resume, ends as failed instead of running
  forever. A flow already finished when a session starts or the mod reloads leaves no bar; ✕ dismisses one by hand.

## Tools it adds

- `mcp__savvy-progress__progress`: the orchestrator reports the plan, the phase and the accepted tasks. A planned
  task waits at its tier's model and effort, or at the `effort` and `model` the plan declares for it (what its Agent
  call will pass); an agent that is no savvy worker is planned with `tier: "other"` and `agent`, its type. A run
  shows the effort its Agent call asked for, then the one the engine reports for each request.
- `mcp__savvy-progress__step`: a worker reports its own steps (`done`, `total`, `note`), and `skipped` for the planned
  steps it left undone, shown beside its count (`6/6 · 1 skipped`). A worker that does not report shows its context
  fill in grey instead. A Codex relay may also send optional string fields `model` (the exact Codex slug),
  `effort` (the reasoning effort it passes to Codex), and `codexStatus` (the unique filename stem for this Codex
  invocation, also unique on a resume). Declarations need no `done` and preserve the prior count and note. A note
  names the actual action, such as "reading CreatureProbe.cs" or "running EditMode tests", never "working".

Both costs are estimates from token counts and built-in tables (`PRICES` for Claude, `GPT_PRICES` for Codex in
`hooks/register.tsx`). GPT family rates use current Standard short-context API prices, verified on 2026-11-12 in
[OpenAI's model catalog](https://developers.openai.com/api/docs/models) and
[pricing page](https://developers.openai.com/api/docs/pricing): input/output/cached input per million tokens are
Luna $0.10/$0.50/$0.01, Terra $1/$5/$0.05, Sol $2/$10/$0.10, Astra $10/$50/$1. Older or future model versions use
these current family rates; unknown families have no price. Processing modes, long-context rates, mixed-model
sessions (priced with their last model) and other billing differences can change the actual amount. A Codex plan's
work is covered by its subscription; the displayed API-equivalent estimate is not an extra charge or a bill.

## Settings

- `language`: `auto` (default), `en`, `ru` or `it`. `auto` follows Claude Code's `language` setting, then the system
  locale, and reads English unless they say Russian; Italian is only ever chosen, so the default stays English on an
  Italian system too. The panel's language picker, beside the theme picker, sets it as well: the panel speaks the
  language at once and the option keeps it.
- `theme`: `auto` (default), `classic`, or one theme pinned until `auto` is chosen again (every id `/savvy-theme`
  lists, from `new-year` to `winter`). `auto` follows the calendar above by the local date, and moves on when the date
  does; `classic` keeps the tiers' everyday costumes (astronaut, detective, engineer, chef, racer, pirate).

Set them with `/plugin configure savvy-progress@pablolok-skills`, or
`claude plugin install savvy-progress@pablolok-skills --config language=en --config theme=classic`.

## Diagnosing worker resumes and stops

Worker lifecycle tracing is off by default. To capture the next SendMessage and agent's events in a CLI session,
start Claude with the environment flag and a debug log:

```powershell
$env:SAVVY_PROGRESS_DEBUG_RESUME = '1'
claude --debug-file savvy-progress-resume.log
```

Reproduce the resume and look for `[savvy-progress:resume-debug]`. The entries record the received SendMessage
`tool.call`, its result, `agent.spawn` and its result when present, and the agent's first `turn.step` (or a step
with a queued title). It also records `classic.SubagentStop`, `turn.complete`, and the stopping worker's
`agent.list` entry and child-agent entries as `agent.list:stop`. They retain event keys and nesting, routing ids,
titles, turn ids, stop reasons, roster status and the matched row.
Message bodies, prompts and other string content are represented by their type and length; records are bounded.
Unset `SAVVY_PROGRESS_DEBUG_RESUME` to disable the trace. The flag does not send messages or enable model calls.

Evidence for the regression: inspection of the installed Claude Code 2.1.295 engine adapter confirms flattened
`tool.call` arguments (`to`, `summary`, `message`, `tool_use_id`, with no sender `agentId` for a main-session call).
Its direct-agent SendMessage resume reuses the loop without dispatching `agent.spawn`. The tests use these
contract-shaped calls and `turn.step` with `agentId`, `turnId`, `index`, `model` and `messageCount`; they reproduce
reuse without a spawn. These are contract/harness fixtures, not a capture of the reported live session. That
session's actual route and event ordering remain unconfirmed until a trace is captured.

Confirmed stop contracts in the same installed engine:

- `turn.complete` carries `agentId`, `turnId`, `answer`, `durationMs`, `isAborted`, `reason` and optional `usage`.
  An ordinary answered stop uses `reason: "answer"`; there is no background-work flag on this event.
- `classic.SubagentStop` carries `agent_id`, `agent_type`, `stop_hook_active` and optional `background_tasks`.
  Each background task has `id`, `type`, `status`, `description` and optional type-specific fields. This array is
  session-wide, not a list of work owned only by the stopping worker; the panel logs it but does not infer ownership.
- `$.agent.list()` carries `id` and `status`. The engine maps a completed worker with live keepalives, or an idle
  worker with its own running background shell or monitor, to `status: "waiting"`. An answer is therefore held
  pending while the roster is still `running`, and `waiting` keeps it live until a terminal roster observation.

The tests pair these contract-shaped stop and roster observations, including the possible asynchronous transition
from `running` to `waiting`. No live session was observable from the sandbox: the reported worker's actual stop
payload and timing are unconfirmed, and that transition order is a tested race scenario rather than a live capture.

## What it holds

| File | Role |
| :--- | :--- |
| `.claude-plugin/plugin.json` | The mod's own manifest: name, version (the publish keeps it equal to `metadata.json`), the `language` and `theme` options, the types. |
| `.claude-plugin/icon.png` | The mod's icon: the crab over a progress bar, a 512 px square. |
| `hooks/hooks.json` | Names the hooks module. |
| `hooks/register.tsx` | The module: the two tools, `/agents-info`, `/savvy-theme`, the bar and the panel with its theme picker. |
| `hooks/sprite.ts` | The pixel crab every figure is drawn on. |
| `hooks/themes.ts` | The calendar, the theme list and the seasons' and first holidays' costumes. |
| `hooks/wardrobe.ts` | What every theme draws from: the palette, shared props, particles, header ornaments and weather. |
| `hooks/dress-winter.ts`, `dress-spring.ts`, `dress-summer.ts`, `dress-autumn.ts` | The holidays' and periods' costumes, by season. |
| `hooks/register.test.ts` | The module's own tests, run by `claude plugin test`. |
| `types/index.d.ts` | Its `$.state` contract. |
| `plugin-entry.json` | `{"strict": true}`: the marketplace entry lets Claude Code read the mod's own manifest. |
| `LICENSE` | The upstream MIT licence. |

## Tests

```bash
python -m unittest tests.test_savvy_progress_skill
claude plugin test skills/savvy-progress
```
