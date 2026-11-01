# Changelog

## [1.3.0] - 2026-11-01
- Halloween theme — animated costumes in the agents panel (vampire, skeleton, spider, bat, ghost, witch, jack-o'-lantern), idle motion for every figure, pumpkin bar and cobweb header; theme option auto (October 15 – November 7) / halloween / classic


## [1.2.2] - 2026-10-15
- Token counts show the unit they round to (999,500 is 1.0M, not 1000k); Haiku 5.5 is priced at its own rates ($0.10/$0.50 per million) with a 1M window, not as Haiku 4.5


## [1.2.1] - 2026-10-15
- Dead runs and a stale bar are cleared — runs are reconciled with the engine's agents list (at start and every 5 s while one runs), the bar's running count is derived from the runs, a flow finished before a start or reload leaves no bar; plugin-prefixed worker types count as savvy; Light and Medium show as Sonnet; the module's own tests ship in hooks/register.test.ts


## [1.2.0] - 2026-10-11
- Imported from johnnyvizz/claude-kit (main, MIT, upstream 1.2.0): the savvy-progress mod (progress bar above the prompt, /agents-info panel, tools progress and step, the language option), unchanged; a plugin with no skill; the upstream LICENSE travels with the plugin.

