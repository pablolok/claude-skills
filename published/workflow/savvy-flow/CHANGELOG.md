# Changelog

## [1.27.0] - 2026-11-28
- relays for the Claude and GPT models of the Antigravity CLI (savvy-agy-opus / sonnet / gpt) on its own "Claude and GPT models" quota, documented and balanced as a family of their own (budget family agy)


## [1.26.0] - 2026-11-26
- Balancing the families: when the user asks to balance work (in words or as a standing default), every signed-in family takes its share tier for tier (Flash/Light, Argon/Medium, Hydrogen/Careful and Heavy, Neon for long reviews), split by budget headroom and said in the plan; an unrated Gemini model is unmeasured, not weaker; stale budget windows are reread, never planned on


## [1.25.0] - 2026-11-26
- Quality skills: when the session has skills that set a bar for code, the orchestrator picks them while planning, requires them in every brief that writes code (each at its moment), keeps code off Light and Medium except dictated mechanical edits, checks the report names them, and applies the diff review and gates to its own commits; with none installed, nothing changes


## [1.24.2] - 2026-11-25
- Connected tools names the panel's fit gate and its why-not-tools line; Progress bar names the tools tier and the routing card


## [1.24.1] - 2026-11-24
- Stop a review, audit or test pass on the current diff as soon as the user changes the request, and relaunch it from the start on the new diff


## [1.24.0] - 2026-11-24
- Gemini Neon relay (savvy-gemini-neon, gemini-4-neon at medium effort) beside Hydrogen for Careful-sized work; measured on 2026-11-24 in references/gemini.md and routing.md


## [1.23.1] - 2026-11-24
- Gemini relays: read-only second opinions may run tests and read-only git commands; writes, git state changes and destructive commands stay denied, and the relay still checks the tree is unchanged.


## [1.23.0] - 2026-11-24
- Gemini stays a relay tier like Codex (savvy-gemini-* run agy -p from Claude); Antigravity-hosted plugin support removed: no manifest, no Antigravity copy, SKILL.md back in one file.


## [1.22.1] - 2026-11-24
- Antigravity: essential mapping inlined in SKILL.md so the orchestrator needs no file lookup; savvy-reviewer subagent on inherit for reviews and audits.


## [1.22.0] - 2026-11-24
- Orchestrates inside Google Antigravity too: an antigravity/ overlay ships five native subagents (Light and Medium on flash, Careful and Heavy on pro, Fable on inherit and plans only on the user's yes), laid over the Antigravity copy as agents/ and kept out of the Claude copy; references/antigravity.md maps the flow (invoke_subagent, the Fable gate asked in chat, update_steps, parallel workers) and leaves out Codex, the Gemini relays and the progress tools. Claude Code behaviour and agents are unchanged.


## [1.21.2] - 2026-11-24
- The Codex stream fixtures and their test carry placeholder thread ids in place of recorded ones.


## [1.21.1] - 2026-11-24
- The Gemini relays run agy with SAVVY_RELAY=1 (task, second opinion, follow-up), so a plugin Stop hook that continues the turn (skill-retrospective's) leaves the headless run to its brief.


## [1.21.0] - 2026-11-24
- Gemini tier: four Sonnet relays (savvy-gemini-flash/argon/hydrogen/carbon) run Google Gemini through the Antigravity CLI (agy -p, stream-json, --sandbox, git state changes denied; read-only second opinions deny writes and commands), follow-ups via --conversation; Carbon is plans only on the user's recorded yes; gemini-status.mjs snapshots usage and plan windows; references/gemini.md; SKILL.md split under 24 kB into references/ for Antigravity; Antigravity copy in published-antigravity/ without Claude agents.


## [1.20.1] - 2026-11-22
- first observed run of the Tools tier (claude-sonnet-5-5): a 13-step editor recipe ran as written at about a quarter of a Careful capture's cost; expected outputs in a recipe come from a previous run of the same take


## [1.20.0] - 2026-11-22
- new Tools tier (savvy-tools, Sonnet with the session's connected tools) for mechanical work through an MCP server or app from a recipe; section Connected tools: route by kind of work, recipes for cheaper tiers and goals for capable ones, repeated recipes become scripts, a new recipe's first run is a trial, observations recorded with exact model ids so a model change triggers a new trial; Codex reaches only the MCP servers its own CLI config declares


## [1.19.4] - 2026-11-21
- tasks that drive an editor or app through an MCP server go to Heavy or Careful, never Light or Medium; check the agent type's tool list before launching


## [1.19.3] - 2026-11-21
- briefs name the domain skills the worker loads before starting, and spell out any word with two readings in the domain


## [1.19.2] - 2026-11-21
- a brief that reuses another piece's scripts has the worker copy them into its own folder, repoint every output and make its runner refuse modules loaded from outside it; a conflict a worker flags (the reference against a gauge, two sources, two views) or any choice that is the user's goes to the user with the evidence, never settled by the orchestrator


## [1.19.1] - 2026-11-18
- The worker rules and the skill no longer say a worker with background work stays listed as running after its report: the panel finishes a handed-back worker and flags what it left; between step calls the panel shows only the tool the worker is in.


## [1.19.0] - 2026-11-18
- Every worker reports a step at the start of each step and before any command expected to run over a minute, starts long commands in the background and waits for their notice, never polls with an unbounded loop, and stops its own background commands (TaskStop, now in the lean and relay tool lists) before its report; the orchestrator does not repeat the step rule in briefs and has a worker that reported while still waiting on background work stop it before accepting the task.


## [1.18.1] - 2026-11-17
- pace is the default budget policy: the orchestrator never asks about the budget unless the user set within


## [1.18.0] - 2026-11-17
- the pace policy in the Spend rule and section 4 — under pace the orchestrator never asks about the budget: it keeps every family's 5-hour and weekly projection at or under 100 % (the week aimed at 90-100 % at its reset) by re-tiering, one costly worker at a time, moving work only within the other family's limits, and pacing when nothing fits; the within policy is unchanged


## [1.17.6] - 2026-11-17
- a review agent never makes the orchestrator wait idle: it gets a narrow brief (the diff, its files and the questions, no new investigation of what workers verified), runs in the background while the orchestrator does everything that does not depend on its verdict (tracker, counts, read-only checks, the commit message, the next brief), and after the fixes the same reviewer is resumed for a targeted check of those points only


## [1.17.5] - 2026-11-17
- a yes recorded with decide is the user's reply to the gate's block, never an earlier sentence: the tool refuses words said before the refusal


## [1.17.4] - 2026-11-17
- progress bar: work that is not in the current plan means re-planning first (the new plan replaces the bar's), and the plan gate refuses launches outside it


## [1.17.3] - 2026-11-17
- the Spend rule monitors usage continuously: budget read at every worker return and step, each family's projection kept at or under 100 % at its reset, tiers cut, briefs shrunk and parallelism lowered when it rises, costly work paused with the user told when nothing cheaper fits


## [1.17.2] - 2026-11-16
- the budget is reported to the user in their local time, to the minute: one compact line per window of each family (percent used, the time it runs out at the current pace or the percent projected at reset, the reset, the day when not today, the time of the reading); the progress tool's timestamps are UTC and are converted from the machine's clock, never presented as local


## [1.17.1] - 2026-11-16
- the top-tier rule says the gate also covers the model override and resumes


## [1.17.0] - 2026-11-16
- Fable and Codex Astra are for plans only (a plan or a design-decision document), each launch and resume on the user's explicit yes recorded with decide; hard bugs and design features go to Heavy or Sol unless the user explicitly asks for Fable; a Spend rule: split every piece by kind of work (design on Careful or Sol, mechanical work on Medium or Light), one fresh worker per step and never one resumed for hours, check budget before every costly launch, cut tiers and ask when a family is projected past its limit


## [1.16.1] - 2026-11-15
- Codex briefs: its sandbox cannot write .git, so Codex leaves the message and the relay commits; a brief names the expected baseline (an editor's start-up notices, a bridge diagnostic) and says a call of its own refused by validation is fixed and sent again, not a stop; suites that create temporary folders in the tree and the agent CLI run outside the sandbox; findings for a document go to an existing file the brief names or come back as text, since the host refuses a subagent's Write of a new report file


## [1.16.0] - 2026-11-15
- the budget rules follow the gate: the estimates line in the ask, the user's yes recorded with decide or /savvy-budget <family> once; a week projected past its limit takes legwork one tier down, asks before every Fable or Codex Astra task and offers the Codex tier as relief with the user's yes; a worker stopped by a rate limit is resumed at the reset, not redone; the orchestrator delegates what reads much to return little (visual reviews with a text report, scripted read-only audits at Medium); clearFinished clears the panel's finished list when the user asks


## [1.15.4] - 2026-11-15
- the costly tiers are paced from the progress tool's budget summary: an ask verdict means asking the user before long work on that family (with the projection and the reset), or moving the work to the other family or a cheaper tier; under full only the short window is paced; the policy is the user's, set with /savvy-budget


## [1.15.3] - 2026-11-15
- Tiering: the top tier takes the hard part (cause, method, decision) and returns briefs for the repeatable execution, which goes to Careful, Medium or the Codex tier; the costly tiers are paced against the plan's rolling usage windows, one per family when the short window is high; long repetitive execution moves to Codex only when the user asked for it or set it as default


## [1.15.2] - 2026-11-13
- Routing: lean tiers cannot edit code where project hooks require Skill calls - such code goes to Careful or above, or Codex


## [1.15.1] - 2026-11-13
- codex-status.mjs --snapshot refreshes the Codex plan reading from the newest session log without running Codex


## [1.15.0] - 2026-11-12
- Codex relays pipe codex exec --json through scripts/codex-status.mjs, a small status file per run (session, model, current action, tokens, plan usage) the agents panel reads; every worker's step note names its actual action


## [1.14.0] - 2026-11-12
- Routing by capability: references/routing.md rates each family on the capabilities a task depends on (reasoning, repository work, interface design, writing, vision, constraint retention, agentic execution, cost), with dated sources, eleven routing rules and an Observed-in-use log the close of a flow adds to


## [1.13.1] - 2026-11-12
- All four Codex relays report the model slug and effort resolved in step 4 to the agents panel before running Codex (needs savvy-progress 1.11.0)


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

