# Changelog

## [1.5.5] - 2026-10-20
- Re-send total and done with tasks: tasks alone resets total to the list length


## [1.5.4] - 2026-10-20
- Accepted tasks leave the tasks list: the panel shows them as Planned once their run is gone


## [1.5.3] - 2026-10-20
- Panel titles: plan before the first worker, verbatim descriptions, SendMessage summary, relaunch keeps the title


## [1.5.2] - 2026-10-20
- Close: remove every worker worktree and branch once integrated, leaving only the branches the repository had before the flow


## [1.5.1] - 2026-10-19
- Chain the add to the commit with &&: a stale path stages nothing


## [1.5.0] - 2026-10-15
- Tasks carry a topic and small tasks of one topic and tier merge into one brief; a new worker is started only when no registered worker of that tier covers the topic; Light and Medium run on Sonnet with lean tools (files, shell, progress), which cut a fresh worker's fixed context from about 60-90k to 8k tokens with no loss of first-pass quality on the measured tasks; briefs name the files to read and load no skill the task does not need


## [1.4.2] - 2026-10-15
- Delegate: an isolated worker's worktree may start from the default branch — the brief names the base commit and the worker resets to it first, the base is checked on return; the orchestrator's full gate also builds, so with a live preview or device test on the working tree's output it runs in a copy of the final tree


## [1.4.1] - 2026-10-14
- A resource with one instance (visible browser, device simulator, dev server port) has one user at a time: run testing workers in sequence or have them all attach to one instance


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

