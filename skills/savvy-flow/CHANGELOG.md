# Changelog

## [1.4.0] - 2026-10-14
- A host's own task list, turn summary and sessions run alongside the flow — the task list holds the tiered plan, workers stay Agent calls, a turn summary does not close the flow; workers deny the host's task-list and session tools


## [1.3.1] - 2026-10-14
- Parallel workers share the index: stage by path and check the staged diff before a commit


## [1.3.0] - 2026-10-12
- one persistent worker per topic, a registry on file, resume or rotate between tasks at 70% of the context window


## [1.2.2] - 2026-10-12
- resume a worker or start a fresh one by cost, with a handoff note


## [1.2.1] - 2026-10-11
- Delegation checks that nobody else holds a task; timing work runs alone and workers run targeted tests


## [1.2.0] - 2026-10-11
- Imported from johnnyvizz/claude-kit (main, MIT, upstream 1.2.0): the savvy-flow orchestrator skill and its five tiered worker agents (savvy-light, savvy-medium, savvy-careful, savvy-heavy, savvy-fable), unchanged; the upstream LICENSE travels with the plugin.

