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
- **Agents panel** (`/agents-info` toggles it): running, finished and planned subagents with model, effort, task
  progress, context, estimated cost and time. Each savvy tier animates its own figure; `prefers-reduced-motion` stops
  them.
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
  fill in grey instead.

The cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in
`hooks/register.tsx`), not a bill.

## Settings

- `language`: `auto` (default), `en` or `ru`. `auto` follows Claude Code's `language` setting, then the system
  locale, and falls back to English.
- `theme`: `auto` (default), `classic`, or one theme pinned until `auto` is chosen again (every id `/savvy-theme`
  lists, from `new-year` to `winter`). `auto` follows the calendar above by the local date, and moves on when the date
  does; `classic` keeps the tiers' everyday costumes (astronaut, detective, engineer, chef, racer, pirate).

Set them with `/plugin configure savvy-progress@pablolok-skills`, or
`claude plugin install savvy-progress@pablolok-skills --config language=en --config theme=classic`.

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
