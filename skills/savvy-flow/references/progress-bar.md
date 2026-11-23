# Progress bar calls

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

## Progress bar

If the tool `mcp__savvy-progress__progress` is available, keep it current; skip silently if it is not. Call it:
- after presenting the plan: `title` (a few words), `total` (number of worker tasks), `tasks` (`[{ title, tier, after }]` in plan order; `tier` without the `savvy-` prefix, `after` the numbers of the tasks it waits for; plus `effort`, `model` and `agent` where section "Models" says so, repeated every time the task is sent again), `phase: "delegate"` (or `"design"` while in section 2);
- each time a task is accepted in review: `done` (accepted so far); switch `phase` to `"review"` while reviewing;
- in that same call, drop the accepted task from `tasks`, and pass `total` and `done` again in that call (a call with `tasks` alone resets `total` to the length of the list and the bar reads 1/1): the panel lists as "Planned" every task in `tasks` it cannot match to a visible run, and a finished run stops being visible, so an accepted task left in the list reads as work not started. `tasks` holds only the tasks still open, numbered again from 1, with `after` renumbered to match;
- if re-planning changes the tasks: the new `title`, `tasks` and `total`, which replace the bar's plan; a piece of work not in the current plan means re-planning first, and the plan gate refuses a worker launch whose `description` is not a task title;
- when the user asks to clear the panel's finished list: `clearFinished: true` (the totals stay);
- once at close: `finished: true`.

When delegating, pass the task's `title` verbatim as the Agent tool's `description` (a return round reuses it too): the agents panel matches runs to planned tasks by it. A run whose name differs stays "Planned" in the panel after its task is committed, which the user reads as work not done. So:
- send the plan to the bar **before** the first worker starts, and copy each `description` from it character for character, never a shorter or reworded name;
- a task handed to a worker already running (SendMessage) carries the task's title as its `summary`;
- a worker relaunched for the same task (a wrong base, a crash) keeps the same title; a task that changes is re-planned in the bar first, then delegated under its new title.
