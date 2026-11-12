# Changelog

## [1.13.0] - 2026-11-12
- The user's choices hold — the orchestrator is the session's model, never switched or proposed otherwise; a model or an effort the user sets wins over the tier's, a general instruction covering every task it describes, and reaches the Agent call, the plan and the bar; an agent the project requires is a task of the plan, declared in the bar (needs savvy-progress 1.9.0); the themes table moves to references/themes.md, one section per month; a worker reports the steps it skipped instead of counting them done


## [1.12.1] - 2026-11-12
- Workers close their step count before the final report (idea from the upstream claude-kit PR #53), so a finished worker never reads as short of its steps


## [1.12.0] - 2026-11-11
- Four Codex tiers by OpenAI intensity — savvy-codex-luna / terra / sol / astra, each relay picks the newest model of its family from Codex's model list and sets the effort; Astra, like Fable, only with the user's yes; the intensities keep their sky emoji in every chat theme


## [1.11.0] - 2026-11-11
- Workers run at their tier's model — only savvy types (never general-purpose or a fork, which inherit the orchestrator's model), legwork gets a tier, savvy-fable only with the user's yes and a reason; a Codex tier (savvy-codex) runs OpenAI models through a signed-in Codex CLI, sandboxed and checked, with the Claude skills a task needs named by path


## [1.10.0] - 2026-11-02
- Chat themes for the whole Italian calendar — a row with mascots, marks and closing line for every holiday, period and season the panel wears; /savvy-theme or the panel's picker switches chat from the next message; All Souls' Day stays sober


## [1.9.1] - 2026-11-02
- Halloween in chat is two days only — October 31 and November 1, as in the agents panel


## [1.9.0] - 2026-11-02
- Theme in chat chosen by the user's ask, then the agents panel's theme option (one setting for both), then the calendar


## [1.8.1] - 2026-11-01
- Chat mascots follow the panel's figures and the tiers' roles — spring worm and kite, summer swim ring and sandcastle bucket, winter skate, fishing rod and yarn, Carnival juggler


## [1.8.0] - 2026-11-01
- Themes in chat for the seasons too — spring, summer, autumn and winter each with tier mascots, the orchestrator's mark, verdict marks and a closing line; a holiday wins over its season, as in the agents panel


## [1.7.0] - 2026-11-01
- Holiday themes in chat — Christmas, Befana, Carnival, Easter and Halloween each with tier mascots, the orchestrator's mark, verdict marks and a closing line, in the agents panel's windows


## [1.6.1] - 2026-11-01
- README — with savvy-progress the agents panel wears the same Halloween costumes


## [1.6.0] - 2026-11-01
- Halloween theme (October 15 – November 7) — tier mascots, spooky verdicts and close in chat only


## [1.5.7] - 2026-10-30
- Isolated worktrees inside the repo folder are git-ignored first; removing a worktree ends its worker, so the topic's next task starts fresh


## [1.5.6] - 2026-10-20
- brief di un worker isolato: comandi shell semplici


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

