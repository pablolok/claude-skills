# Running in Antigravity

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

You are in Google Antigravity (its CLI `agy` or its app) when you have the `invoke_subagent` tool and no Agent tool.
The flow is the same: you plan, own the design, delegate every task to a tiered worker and review what comes back.
Where this file and `SKILL.md` differ, this file wins.

## Workers (sections 0 and 3)

The plugin ships six Antigravity subagents. Each one's `model` is a tier fixed in its definition; Antigravity picks
the model behind `flash` and `pro`, and sets no effort per subagent, so tiers that share a model differ by their
instructions.

| Tier | Subagent | `model` | Tools |
|------|----------|---------|-------|
| Fable | `savvy-fable` | `inherit` (the session's model) | files, shell, web search and pages |
| Heavy | `savvy-heavy` | `pro` | files, shell, web |
| Careful | `savvy-careful` | `pro` | files, shell, web |
| Medium | `savvy-medium` | `flash` | lean: files and shell |
| Light | `savvy-light` | `flash` | lean: files and shell |
| Reviewer | `savvy-reviewer` | `inherit` | read-only: view, search, run checks |

- Observed in live runs (Antigravity CLI 1.5.15, November 2026): `flash` ran Gemini 4 Hydrogen at high reasoning,
  `pro` ran Gemini 4 Hydrogen at xhigh, and `inherit` ran the session's model. That is the account's routing, not a
  promise of the plugin, and it may change. Pick tiers by the kind of work as section 3 says; never change the
  session's model.
- The section 0 checks do not apply: skip `codex login status` and `agy models`. If `invoke_subagent` does not offer
  these six, stop and tell the user.
- Not available here: the Codex tier, the Gemini relays (`savvy-gemini-*`: the workers already run on Antigravity's
  models, so a relay would only add a hop) and `savvy-tools`. No worker reaches MCP servers or a browser: a task
  that needs one goes back to the user with that fact, never to a worker without the tool. Skip `references/codex.md`,
  `references/gemini.md` and `references/connected-tools.md`; `references/routing.md` still guides the choice
  between a lean tier (`flash`) and a full one (`pro`).

## Delegating (section 4)

- Call `invoke_subagent` once per task: `TypeName` the worker (`savvy-light`), `Role` the task's title, `Prompt` the
  self-contained brief, `Model` the worker's own tier from the table, `Workspace` `inherit`. Never
  `self`, `research`, `browser` or a `define_subagent` agent for a plan task: they run without the worker's rules.
  A wide search is a Light or Medium task with a search brief.
- Ask for an isolated git worktree (`Workspace` `branch`) only where `references/parallel-workers.md` would isolate a
  worker. Several `invoke_subagent` calls in one turn run at once: run in parallel only what that file allows.
- A worker's report reaches you as a message from it. It then goes idle and keeps its context: a message to its
  conversation id resumes it, which is the resume of `references/worker-registry.md`; keep the id in the registry row.
  `manage_subagents` lists the workers and kills one; a killed worker cannot be resumed.
- A worker that fails to start (an error naming its definition, a tool not found) is reported to the user with the
  error, and the task waits. Never edit the plugin's agent files or stand in a `define_subagent` copy.
- Workers inherit your permissions and sandbox, and their approval requests reach the user. They report no progress
  steps: the user follows them in the agents panel (`/agents` in the CLI).

## Fable: plans only, on the user's yes in chat

`savvy-fable` keeps its rule from section "Models": plans only (a plan or a design-decision document), each launch and
each resume on the user's explicit yes. There is no `decide` tool and no gate here, so the gate is you: before each
launch or resume, ask in chat (the plan, why Fable rather than Heavy, the cost, your recommendation), end your turn and
wait. Launch only on a yes the user gives in reply to that question; it covers one launch unless their words set more.
Since `savvy-fable` runs on the session's model, the rule is about the kind of task, whatever that model is.

## Reviewers, auditors and second opinions

- Every review or audit you delegate (a reviewer or auditor the project requires, an independent read of a diff)
  runs as `savvy-reviewer` with the brief and the diff or result to check. It is read-only and on `inherit`, so it
  runs on the session's model: a rule that asks for a given model is met when the session is on that model. When it
  is not, tell the user instead of running the review on another model.
- A second opinion from another family: on a session that is not on Gemini, `savvy-medium` gives one, read-only (its
  brief forbids edits); on a Gemini session no other family is available here, so say so.

## What this host lacks or has instead

- **Progress bar and budget**: no `savvy-progress` tools. Skip section "Progress bar", `references/progress-bar.md`,
  `references/budget.md`, the `budget` summary and `decide`. Keep the spend rules by judgment: the cheapest tier that
  gets the task right, one fresh worker per step, one costly worker at a time when the plan is long.
- **Task list**: the host's step list (`update_steps`) is the host task list of `references/host-tools.md`, which
  applies: it holds the tiered plan, a step is done when its task is accepted in review. Workers are always
  `invoke_subagent` calls, never a swarm, a workflow or a separate conversation (`/swarm`, `/teamwork`, `/boost`,
  `run_workflow`), unless the user asks for one.
- **Themes**: `references/chat-themes.md` applies; there is no agents-panel option to read, so the user's ask, else
  the calendar.

Sections 1, 2, 5 and 6 apply unchanged.
