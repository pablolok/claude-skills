# Changelog

## [1.27.1] - 2026-11-28
- an account with no Claude and GPT group reads only the newest Gemini status file again; the agy /usage reread is tested


## [1.27.0] - 2026-11-28
- the agy family — Antigravity's "Claude and GPT models" quota read beside Gemini's from the same status files and agy /usage, its own tile, budget, gate and /savvy-budget agy; the agy relays' rows and tokens


## [1.26.1] - 2026-11-26
- the budget tool and the gate wait for the agy reread a tick has started, the tick stops retrying a failed agy until a newer reading, a stale window already at 100 % still asks, agy timeout 10 s


## [1.26.0] - 2026-11-26
- Truthful budget: Codex and Gemini readings carry the time the provider reported them; a reading older than half an hour is stale (shown with its age, no projection, no verdict); a stale Gemini reading is reread from agy -p /usage (tick, progress, budget and before the gate on a Gemini tier, at most every five minutes, never while a Gemini relay runs); a passed reset reads used 0 with resetsAt null; average pace divides by at least an hour (5h) or a day (week), and the weekly recent slope spans a day, so a window minutes old or one busy session no longer projects many times the limit; budget windows add readAt and stale; decide accepts the answer the user picked in AskUserQuestion; the routing card names the Codex and Gemini twin of each Claude tier


## [1.25.0] - 2026-11-26
- A worker that stops with its own step count open (done below total) is asked once per task, through SubagentStop's block, to close it with done equal to total and skipped, then to give its final report again unchanged; never while the host continues it from a stop hook, after a hand-back, or over another hook's block. A finished run whose count stayed open reads 'counter not closed' (contatore non chiuso) in grey, its partial bar grey and without the stale step note, apart from running and done rows.


## [1.24.0] - 2026-11-25
- Tools tier: color, label, Medium's costume, estimates and a value of the plan's tier. Routing card: a progress call that sets tasks, and a compaction or a resume with a plan open, give the routing rules again. Fit gate: a Fable, Heavy or Careful launch whose brief reads as a ready run through a connected tool is refused and pointed at Tools, unless the prompt says why-not-tools with a reason


## [1.23.0] - 2026-11-24
- Gemini Neon tier: color, costume, badge, effort, model name and budget gate


## [1.22.1] - 2026-11-24
- Antigravity plugin manifest and install line removed: the plugins run in Claude Code; Gemini is used only through savvy-flow's relay tier.


## [1.22.0] - 2026-11-24
- A third model family, gemini, beside claude and codex, for savvy-flow's Gemini relays (savvy-gemini-flash, -argon, -hydrogen, -carbon on agy): each relay figure wears its tier's costume on a sparkle body with its badge (bolt, bulb, drop, gem) in a color of its own; the step tool takes geminiStatus with the model and effort passed to agy, and the panel reads ~/.gemini/savvy-status/<name>.json (and a plan-only snapshot.json) for the row's state, action and tokens (no cost: no verified price table) and for the Gemini Models group of agy's /usage, used as round((1 - remaining_fraction) * 100) % per 5-hour and weekly window; the plan tile, the compact line, the budget summary, /savvy-budget gemini, decide with family gemini, and the budget gate on savvy-gemini-hydrogen and savvy-gemini-carbon follow; savvy-gemini-carbon is for plans only, gated like Fable and Astra until decide records tier carbon, at launch and on a SendMessage resume.


## [1.21.2] - 2026-11-19
- The agents panel never draws a copy that lacks a run the live list holds as running: the run ids are kept beside the copy, and a copy taken before a run started (after a session respawn, which empties the session state, or while the picker holds the panel) gives way to the live values, so a live worker no longer shows as 'No subagents yet' with no cost and no time.


## [1.21.1] - 2026-11-18
- A worker parked on its own background work (a command it started there or one the host moved there) reads 'waiting on background work' with the time it has waited, until a model step shows it at work again; the README says the hand-back tool exists only in some permission modes (auto among them).


## [1.21.0] - 2026-11-18
- A worker that delivered its report through SubagentHandback is finished at once, whatever its roster says: a command it left in the background no longer keeps it running as a ghost, and its row reads 'background work left running'. A running worker's row shows the tool call it has been in for 30 seconds or more, with its time, so a long command never leaves the row silent; the step tool asks for a call at the start of each step and before each long command.


## [1.20.0] - 2026-11-17
- a family with no stored policy is on pace: nobody has to type /savvy-budget; within is the opt-in to be asked, and a stored within, full or pace still wins


## [1.19.0] - 2026-11-17
- the pace budget policy — /savvy-budget <family> pace, or decide with policy pace on the user's words, persists until changed; under it the budget gate never refuses a costly tier, a projection over 100 % has verdict retier with an advice string, a weekly projection under 90 % with the reset under two days away has verdict spend, and the bar title shows pace (ritmo in Italian); the top-tier gate is unchanged


## [1.18.0] - 2026-11-17
- the decide tool takes a yes only from a user message submitted after the gate's latest refusal: each refusal of the budget gate (per family) and of the top-tier gate (per tier, Agent launch and SendMessage resume) records when it happened and how many user messages the session held; a quote found only in earlier messages is refused (en and it) with "ask the user now, and quote their reply"; with no refusal yet the quote must still come from a user message


## [1.17.0] - 2026-11-17
- a plan gate on the Agent tool: while a plan with tasks is active, a savvy worker whose description is not the title of a task of the current plan is refused, with the way out (call progress with the new title, tasks and total, then launch with description = the task's title), so the bar and the panel cannot keep a stale plan; it does nothing without tasks or once the flow is finished, non-savvy agents (Explore, claude-code-guide) and SendMessage resumes pass


## [1.16.1] - 2026-11-16
- the top-tier gate also covers the model override: an Agent call of any type with a Fable model (any case, or a model id) is gated and spends a permit, and so does a resume of a worker running on Fable; the Agent tool offers no Astra model, so Astra stays gated by its relay type


## [1.16.0] - 2026-11-16
- a top-tier gate: the Agent tool refuses savvy-fable and savvy-codex-astra (plain or savvy-flow:-prefixed) whatever the budget verdict, until the user's yes is recorded with the decide tool (tier fable or astra, their words; one launch by default, uses a number or "session"); a SendMessage resume of a worker the panel knows as one of those tiers is gated and spends a use too; the refusal says the tier is for plans only and offers Heavy (Sol for Astra); the tier yes does not open the budget gate


## [1.15.0] - 2026-11-15
- a budget gate on the Agent tool: while a family's verdict is ask, its costly tiers (Fable, Heavy, Careful; Codex Sol, Astra) are refused with the projection, the reset and the way out, until the user's yes is recorded — /savvy-budget <family> once, or the new decide tool quoting their words — valid until the family's next reset (five hours at most); every model step adds to a Claude spend kept with each plan reading, and the budget and progress tools add an estimates line: a tier's mean finished run as a share of each window; Clear finished beside the panel's Finished list, and the progress tool's clearFinished, empty it while the totals keep counting those runs; Russian removed and Italian detected on auto: everything the plugin writes in words (bar, panel, plan tiles and dates, commands' answers and descriptions, its messages to the model) follows the language, the tools' JSON and descriptions stay English


## [1.14.1] - 2026-11-15
- the progress and budget tools return text, as the host requires: the progress acknowledgement first, then a budget: line with the summary as compact JSON (1.14.0 returned an object, which the host rejected)


## [1.14.0] - 2026-11-15
- the plan tiles project each 5-hour and weekly window to its reset (→ 72%, or 100% ↯ Thu 14:00 when it runs out first, amber under full, red under within) from a recent or average pace; a budget policy per family set with /savvy-budget <claude|codex> <within|full> and shown in the tile title; a ! on the compact line for a family that will not fit under within; the progress tool returns a budget summary per family and window, and a read-only budget tool returns it without touching the bar


## [1.13.4] - 2026-11-15
- The reset icon stands apart from what follows it: a plan tile reads '↻ 18:20' and '↻ Thu 02:00', no longer a glyph glued to the time like a stray letter


## [1.13.3] - 2026-11-15
- The weekly plan reset names its day: a wide tile shows the 7-day reset as a short weekday and time (a short date when it is more than six days away), the 5-hour reset keeps the time alone; the Claude plan reading is polled at most once a minute on the panel's existing tick and on worker events, keeps its last figures and age when a read fails, and its windows now go to 'reset' when their reset time passes; the README describes the compact line as it is (percentages only)


## [1.13.2] - 2026-11-13
- Without Codex in use (no Codex worker, no Codex plan reading) the Cost and Tokens tiles, the compact totals and the compact plan line name Claude alone instead of carrying a Codex dash


## [1.13.1] - 2026-11-13
- A family with no plan reading gets no tile: without Codex the Claude plan tile and its meters span the whole row instead of sitting beside an empty Codex tile


## [1.13.0] - 2026-11-13
- The plan usage drawn in the panel's own style: a Claude and a Codex plan tile under Cost, Tokens and Time, each window with a meter in its family's colour (red past 90 %), stacked when narrow, one line in the compact view; the last Codex reading kept with its age across restarts; '—' for a family with no data; Codex rows name the model once; rounds counted by agent and title; a resumed worker's new title and a worker waiting on its own background work handled from the engine's real contracts (an opt-in trace, SAVVY_PROGRESS_DEBUG_RESUME=1)


## [1.12.0] - 2026-11-12
- The header shows each subscription's 5-hour and weekly usage (Claude from the engine's rate limits, Codex from the runs' status files) and the totals split by family (Claude, Codex); a Codex row counts and prices Codex's own tokens, shows its current action, and stays running while Codex works; a finished run with unfinished steps shows their ratio; a worker resumed for a new task takes the new title


## [1.11.2] - 2026-11-12
- A planned Claude alias takes the newest version seen in the session, since an alias resolves to its family's newest, so a run pinned to an older model never relabels it


## [1.11.1] - 2026-11-12
- A planned Codex row names the predicted model but no effort, since the user's effort for Codex is in the brief the bar never sees; a cache re-read that finds the same models no longer redraws the idle panel every minute; the cache path tests pass on every platform


## [1.11.0] - 2026-11-12
- Worker rows name the model with its version and effort: Codex relays declare their exact model and effort through step; planned and undeclared Codex workers predict the newest visible family model from the home cache, read at most once a minute; Claude planned aliases learn their version from the first resolved run in the session


## [1.10.0] - 2026-11-12
- Italian for the bar and the panel, chosen and never detected (English stays the default), and a language picker in the panel beside the theme's; the language option takes it


## [1.9.1] - 2026-11-12
- The module's tests type-check against the engine's current types (the slot above the prompt takes more props); the mod ships an icon, the crab over a progress bar, so plugin validation raises no warning


## [1.9.0] - 2026-11-12
- A planned task shows the effort and the model its Agent call passes — a task of the progress tool may declare effort and model (shown in place of its tier's), and an agent of no tier with tier other and agent, which then counts on the bar like a worker; a run shows the effort its Agent call asked for from its first frame; the step tool takes skipped, the planned steps a worker left undone, shown beside its count (6/6 · 1 skipped)


## [1.8.1] - 2026-11-12
- Fixes, ideas from the upstream claude-kit (merged commits 7f311a3 and 37d524b, PRs #52 and #40, issue #57) — the desktop band sizes itself to the slot so the count and the dismiss stay visible; the Tokens total leaves cache reads out; only the main session reports the flow; a step with no panel row says so; a run whose spawn gave no agentId takes it from its Agent call


## [1.8.0] - 2026-11-11
- Codex figures — a cloud with a >_ face wears every theme's costume (Astra as Fable, Sol as Careful, Terra as Medium, Luna as Light) with its intensity's badge (moon, globe, sun, star) and colour; a Codex run shows Codex · <intensity> instead of its relay's model


## [1.7.4] - 2026-11-07
- The bar says what the agents panel says — every agent the panel lists as running, a reviewer or verifier outside the plan too, is counted beside the accepted tasks (Review 1/1 · 1 running), and while one runs the bar stops at 99% instead of reading 100%; the progress tool's answer says the same


## [1.7.3] - 2026-11-02
- The theme picker's list no longer jumps while agents run: the panel holds still for as long as the picker has the focus, across the reload a pick causes


## [1.7.2] - 2026-11-02
- The theme picker's list no longer jumps on opening or reopening — the agents panel draws a copy of its values the tick refreshes once a second, and while the picker has the focus (up to a minute) the copy waits, the focus itself writing nothing; a pick or the focus moving on lets it catch up


## [1.7.1] - 2026-11-02
- The theme picker's open list stays where it is scrolled — while the picker has the panel's focus the panel holds its view (up to twenty seconds), so running agents' redraws no longer send the list back; a pick redraws the held view in the new theme, the focus moving on lets it go


## [1.7.0] - 2026-11-02
- The full Italian calendar — every holiday (New Year's Day to New Year's Eve, Republic Day with every figure waving the tricolour, a sober All Souls' Day), the periods (Christmas season, winter and summer sales, Easter and summer holidays, back to school) and the seasons from the 1st of the month, a costume per tier for each; /savvy-theme <theme|auto> and a theme picker in the panel set it and redraw at once, the pick kept until auto


## [1.6.1] - 2026-11-02
- Halloween is two days only — October 31 and November 1; the rest of autumn wears the autumn theme


## [1.6.0] - 2026-11-02
- Winter's flurry over the agents panel — now and then, for a few seconds every half minute, light snow drifts down the header's free band right of the flow's title and settles on the tiles, drawn beneath the title, ornament and tiles so it covers no text or bar; its phase follows the clock, so the once-a-second redraw does not restart it; prefers-reduced-motion hides it


## [1.5.0] - 2026-11-01
- Each tier in its own costume for its role in every theme — seasons get one per tier (spring: butterfly, digging, watering, potting, kite, net; summer: swim ring, snorkel, sandcastle, watermelon, surf, spyglass; autumn: owl, mushrooms, chestnuts, grapes, rake, hike; winter: skating, ice fishing, knitting, cocoa, sled, polar lantern), and the holidays an explorer of their own (stargazer, lantern, Capitan Spaventa, binoculars), Santa checks his list, Arlecchino juggles


## [1.4.0] - 2026-11-01
- Themes for the calendar — Christmas, Befana, Carnival, Easter and Halloween costumes per tier, and one outfit per season tinted with the tier's color (flowers, straw hat, beret and scarf, beanie), with falling snow, petals, leaves and confetti, a header ornament and bar colors per theme; every figure moves; theme option lists them all, auto follows the calendar


## [1.3.0] - 2026-11-01
- Halloween theme — animated costumes in the agents panel (vampire, skeleton, spider, bat, ghost, witch, jack-o'-lantern), idle motion for every figure, pumpkin bar and cobweb header; theme option auto (October 15 – November 7) / halloween / classic


## [1.2.2] - 2026-10-15
- Token counts show the unit they round to (999,500 is 1.0M, not 1000k); Haiku 5.5 is priced at its own rates ($0.10/$0.50 per million) with a 1M window, not as Haiku 4.5


## [1.2.1] - 2026-10-15
- Dead runs and a stale bar are cleared — runs are reconciled with the engine's agents list (at start and every 5 s while one runs), the bar's running count is derived from the runs, a flow finished before a start or reload leaves no bar; plugin-prefixed worker types count as savvy; Light and Medium show as Sonnet; the module's own tests ship in hooks/register.test.ts


## [1.2.0] - 2026-10-11
- Imported from johnnyvizz/claude-kit (main, MIT, upstream 1.2.0): the savvy-progress mod (progress bar above the prompt, /agents-info panel, tools progress and step, the language option), unchanged; a plugin with no skill; the upstream LICENSE travels with the plugin.

