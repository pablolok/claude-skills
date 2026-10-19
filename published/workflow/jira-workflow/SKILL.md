---
name: jira-workflow
description: Use whenever work is tracked in Jira — before touching code, at every step, on a status change, commit or release, and when creating tickets, logging time or linking dependencies through the Atlassian connector. Tracker first, status moved when the fact happens, points and hours on every ticket, continuous worklogs, Blocks links in the right direction, the total review queries and the connector's pitfalls. Statuses, labels, sprints and field ids come from the project's playbook.
---

# Jira Workflow

The tracker is the first tool, not the last: it says what is true before the code, the backlog file, the commit or
the release does. Every rule below is generic; what differs between projects is a **parameter** the project's own
Jira playbook declares (a file the project keeps, such as `docs/agent-playbook/jira.md`). Read that playbook before
the first Jira call of a session. When this skill and the playbook disagree on a value, the playbook wins; when they
disagree on a rule, raise it with the user.

## Parameters the project declares

The project playbook fixes these; the skill never assumes them.

| Parameter | What it fixes | Example |
| :--- | :--- | :--- |
| Site and `cloudId` | where the calls go | `https://<site>.atlassian.net`, a UUID |
| Project key and board | which tickets and which board (Scrum or Kanban) | `PROJ`, board 2 |
| Status cycle | the statuses and the event that moves a ticket into each | to do → in progress → to test → ready → released, plus a waiting-for-user status |
| Transition ids | the id of each transition, when names are ambiguous | `31` → in progress |
| Role labels | the label for the user's manual work and the one for the agent's work | `manual-user`, `agent` |
| Plan labels and sprints | which sprint each plan's tickets go into, and the sprint for urgent work | `plan-1` → sprint "Plan 1", "Urgent" |
| Points constant | how many minutes one story point is, and the size table | 1 point = 30 minutes; S 1h/2 · M 2h30/5 · L 4h/8 |
| Story point field | the field the board measures (`getJiraBoardConfig` → `estimation.field`), the only one written | `customfield_NNNNN` |
| Goals and key results | which goal tracks which Epic, and how its count is written | "Done and released: N of M" |
| Title conventions | how a ticket title names its source | `[1.4] Title`, `[backlog 12] Title` |
| Where dependencies are written | the plan or file whose dependencies must all be links | a dependency column in the plan |
| Release source | where a version's description comes from | the release notes file of that version |

## 1. Jira first

- Update the tracker **before** code, the backlog file, commits and releases. If a file and Jira diverge, Jira wins
  and the file is corrected.
- Starting work moves the ticket to the in-progress status; if there is no ticket, create it first.
- At every step, a comment: what was done, the commit, the tests. Work with several steps has one sub-task per step.
- A discovery (a defect, a new piece of work, a decision) becomes a ticket at once, not at the end of the session.
- If the connector does not answer, tell the user and note in the commit what Jira is missing. Never skip in silence.

## 2. Status moves when the fact happens

- Never in a final sweep: one ticket at a time, at the moment of the event (work started, tests green, merged and
  deployed, verified live, waiting for the user).
- **A parent with an open sub-task stays in progress.** The waiting-for-user status is only for a ticket with no open
  work that waits for the user alone. A wait for the user's approval is written in that step's sub-task, never in the
  parent's status. Look at the sub-tasks before moving a parent. A sub-task assigned to the user that the
  conversation completes (a decision, a specification given in chat) is closed in that step's round, with a comment
  quoting where it was given: left for the end, it holds the parent back.
- **When a parent closes, or the piece of work it tracks ends, run the `skill-retrospective` skill** (when it is
  installed) on the skills the work used: the close is the end of a piece of work, the moment the retrospective is
  due — nothing else asks for it.
- At every transition, in the same round: the right `fixVersion` and a comment.

## 3. Comments

- **Bug**: "Cause: …" (measured, not guessed) and "Fix: …" (what changed, with which tests), at the latest when the
  bug moves to the to-test status. An uncertain cause is written as uncertain, with what was measured.
- Every correction of a status or a field has its own comment that says why.

## 4. Who does what

- The user's manual work (deciding, testing on a device, publishing, signing in to an account) is assigned to the
  user and carries the manual role label.
- The agent's operational work has no assignee and carries the agent's role label.
- Every ticket has exactly one of the two labels. A hand-over changes both and says so in a comment.

## 5. Sprints

- A plan's ticket goes into its plan's sprint at creation (`assignToSprint`), with the plan's label.
- **An Epic never goes into a sprint**: the board counts it as one more ticket, so its points would add to its
  children's.
- A separate sprint collects urgent work: production bugs and discoveries to fix now.
- A Kanban board has no sprints: there only the status moves.

## 6. Estimates: points and hours on every ticket, at creation

- Every ticket — sub-tasks and closed tickets included — has story points and an original estimate. Points = hours ×
  the points constant. Epics are the exception, below.
- **Points go in the field the board measures**, read with `getJiraBoardConfig` (`estimation.field`) before the first
  point is written, never assumed from a field's name: every report reads only the board's one.
- If the board measures another field, **move the points to the board's field once and write only that one from
  then on**; then take the old field off the project's screens rather than clearing it.
- No sub-task goes below 15 minutes. A parent with sub-tasks has original estimate `0m` and the sum of its sub-tasks'
  points. **An Epic has no points in the board's field** (the board would count them twice).
- A closed ticket has the estimate from its size, a worklog with the real hours, and remaining `0m` written on purpose.
- When a ticket's scope changes, re-estimate it at once, with a comment.
- **An estimate must match the real hours**, estimated from closed tickets of the same kind; at close, a gap of more
  than twice, either way, is a defect whose cause goes in a comment. The real hours are the sum of the worklogs read
  back from the tracker, never a total recalled: a figure from memory hid a gap past twice.
- Read `references/estimates.md` before writing the first points on a board, moving points between fields, sizing a
  kind of work for the first time, or explaining a gap.

## 7. Time tracking: continuous and precise, no exceptions

- Log work while working: at every step and when a task is declared complete, never rebuilt at the end of the day.
- Real hours, not the estimate: `started` is when the work began, `timeSpent` runs from start to finish. Short
  operations (creating tickets, fixing a status, linking two tickets) get their worklog too.
- **The finish is the clock, read when logging** (`date`), never a guessed end: a worklog written with an end in the
  future, or an end reckoned from memory, overstated short tasks two to three times.
- No task moves to a completed status without a worklog.
- If a worklog cannot be recorded (rate limit, an error, uncertain hours), tell the user at once with the ticket,
  start, end and hours, so they can log it.
- Hours rebuilt after the fact say so in the worklog's comment.

## 8. Goals and releases

- At every status change, update the goals and key results the ticket counts in: the "N of M" count and an update
  with the score. Count with **one** query over every Epic (`parent in (<keys>)`, fields `parent` and `status` only),
  tallied locally — never one query per Epic: a set of counts is where calls get fired together.
- A released version holds only closed tickets. If the work is live but its verification is not, the verification
  becomes a ticket of its own.
- A verification that fails becomes a new Bug that **blocks** the verification ticket: the verification stays open,
  with a comment of what passed and what failed, gets no `fixVersion` until it passes, and is repeated after the
  release that carries the fix — never a second verification ticket for the same check.
- Every closed ticket has a `fixVersion` and a resolution.
- At every release the version becomes released, with its date, and the next one opens at once.

## 9. The total review

After a heavy day of work and before every release, the total review's checks must return **zero rows**, except
tickets the user opened by hand: labels and assignees, sprints, descriptions, versions and resolutions, points and
estimates, Epics, the board's field, key results, the counts only a script can check, and the dependencies (group
12). Read `references/total-review.md` and run every check in it.

## 10. The Atlassian connector

- Read the `cloudId` once per session and pass it on every call.
- `discover` an operation you do not know, then run it with `executeRead`, `executeWrite` or `executeDestructive`.
- **One call at a time**, independent reads included: a general rule to parallelise independent work does not
  reach the tracker. Parallel calls — several agents, or one batch — hit the rate limit (HTTP 429; on a free site
  past 4–5 agents, and an hourly cap after about 1000 calls). On a 429, stop and tell the user; never wait in a loop.
  A written rule was still broken under load: where the project can, a hook enforces it (a lock taken atomically
  before each connector call, with an expiry). Release it on **every** outcome — success, failure and a permission
  denial: the after-call event fires on success only, and a failed call held the lock until it expired.
- **Only an agent that has the connector makes the calls.** A worker with a reduced tool set may lack it and stops
  without a ticket: check its tools before delegating a tracker step, or keep the tracker calls in the session.
- **A write answers with the whole ticket.** `createJiraIssue`, `editJiraIssue` and `transitionJiraIssue` send back
  the ticket's entire description and fields, which the session pays for in tokens on every call. Where the connector
  offers it, write and read through `executeWrite` / `executeRead` with `responseFields` naming only what the next
  step needs, or through a compact view; never read a ticket back right after writing it — the write's own answer is
  the proof, except where a rule asks for a check (a link's direction, a field a compact read leaves out), and then
  read only that field.
- Read `references/connector.md` before an operation you have not run this session — creating with time tracking,
  closing with a resolution, editing a worklog, linking a goal, a JQL on sub-tasks or empty fields, a compact read,
  a long description, a field taken off a screen. Its one rule to keep in mind always: **a report that shows nothing
  is a defect**, not an absence of data.

## 11. In chat

- Every ticket key in a chat reply is a clickable link, `[PROJ-123](https://<site>.atlassian.net/browse/PROJ-123)`,
  also when cited in passing and in short messages between actions. In commits, Jira comments and files the key stays
  plain text.

## 12. Dependencies between tickets

- **Every dependency is a Blocks link**, set when the ticket is created or the moment the dependency is found. Never
  only written in a description.
- **Check the direction.** With `createJiraIssueLink` and type Blocks, `inwardIssue` blocks `outwardIssue`: the
  ticket to do first is `inwardIssue`. Then read the blocked ticket back: it must say "is blocked by".
- Relates only for two tickets that are related but independent. A real dependency is never a Relates.
- Links work across projects too (a shared tool and the project that uses it).
- **Work order follows the dependencies.** The blocking ticket is done first; a ticket blocked by an open one does not
  move to in progress. If it must start anyway, tell the user and write why in a comment.
- When a ticket closes, look at the tickets it blocks: they are ready now, and the closing comment says so.
- The connector cannot delete a link. A wrong or outdated one (a Relates that became a Blocks) is reported to the
  user, who removes it from the interface.
- The dependency check is part of the total review (group 9).
