# Changelog

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

