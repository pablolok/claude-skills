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
  parent's status. Look at the sub-tasks before moving a parent.
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
  point is written, never assumed from a field's name: a site can hold two point fields (a locked "Story point
  estimate" and a plain "Story Points"), and every report — burndown, burnup, velocity, version report — reads only the
  board's one. Points written elsewhere leave every report empty.
- If the board measures another field, **move the points to the board's field once and write only that one from
  then on**, never keep two fields in step. A company-managed board's estimation panel may offer only a method ("Story
  points") with no field choice and bind it to a plain number field by name — never to the locked "Story point
  estimate"; removing that field makes the board create a new one. So the board's field is the field: put it on the
  project's screens, copy the values over in one bulk edit per value (by the site admin, with notifications off),
  then **take the old field off the project's screens** rather than clearing it: first check that nothing reads it
  (boards, saved filters, automation rules), then its values may stay frozen, since clearing costs one write per
  ticket and protects nothing. A locked field stays writable through the API even off every screen, so the agent
  never sends the old field again. Confirm every step with `getJiraBoardConfig` and JQL, never with the panel, which
  can show a stale value; a field just added to a screen can be refused for a minute.
- No sub-task goes below 15 minutes.
- A parent with sub-tasks has original estimate `0m`; its points are the sum of its sub-tasks' points.
- **An Epic has no points in the board's field.** The board treats an Epic as one more ticket: wherever the Epic and
  its children meet (a sprint, a version), its points count twice — measured: a burndown at 68 instead of 18.5, a
  version report at 352 instead of 198. The Epic report already sums the children itself, and a sum written by hand
  drifts from them.
- A closed ticket has the estimate from its size, a worklog with the real hours, and remaining `0m` written on purpose.
- When a ticket's scope changes, re-estimate it at once, with a comment.
- **An estimate must match the real hours.** Estimate from the real hours of closed tickets of the same kind; a
  size table calibrated on one kind of work (features with tests, migrations and several sessions) never sizes
  another (documents, tracker operations, skill edits). A ticket whose description is already the full specification
  costs less than one that still has to write it.
- At close, compare the estimate with the logged hours: a gap of more than twice, either way, is a defect — find the
  cause (the estimating method, a missing worklog) and write it in a comment.

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
  with the score.
- A released version holds only closed tickets. If the work is live but its verification is not, the verification
  becomes a ticket of its own.
- A verification that fails becomes a new Bug that **blocks** the verification ticket: the verification stays open,
  with a comment of what passed and what failed, gets no `fixVersion` until it passes, and is repeated after the
  release that carries the fix — never a second verification ticket for the same check.
- Every closed ticket has a `fixVersion` and a resolution.
- At every release the version becomes released, with its date, and the next one opens at once.

## 9. The total review

After a heavy day of work and before every release, these checks must return **zero rows**, except tickets the user
opened by hand:

- `issuetype != Epic AND labels is EMPTY`, and tickets without one of the two role labels;
- the manual label without an assignee, or the agent's label with one;
- a plan's ticket outside its sprint (`sprint is EMPTY`);
- a description without acceptance criteria, a "what to do" section or reproduction steps;
- `fixVersion in releasedVersions() AND statusCategory != Done`;
- `statusCategory = Done AND fixVersion is EMPTY`;
- `statusCategory = Done AND resolution is EMPTY`;
- `issuetype != Epic AND` the points field the playbook names `is EMPTY`, and `originalEstimate is EMPTY`;
- `issuetype = Epic AND (` the points field `is not EMPTY OR sprint in openSprints())`;
- the board's `estimation.field` (`getJiraBoardConfig`) is the field the playbook names;
- key result counts equal to their Epics' counts;
- **what a query cannot check runs from a script the project keeps**, read-only, that returns the differences and
  must return none: every sprint report, burndown, version report and Epic report against the sum of its own tickets
  (never a sample — a check on one sprint left another counting points twice), a parent against the sum of its
  sub-tasks, no Epic with points or in an open sprint, every done ticket with a worklog, version and resolution;
- **dependencies** (group 12): every dependency written in a description or in the plan has its Blocks link, and no
  ticket blocked by an open one is in progress or beyond without a comment that says why.

## 10. The Atlassian connector

- Read the `cloudId` once per session and pass it on every call.
- `discover` an operation you do not know, then run it with `executeRead`, `executeWrite` or `executeDestructive`.
- **One call at a time.** Parallel calls — several agents, or one batch — hit the rate limit (HTTP 429; on a free site
  past 4–5 agents, and an hourly cap after about 1000 calls). On a 429, stop and tell the user; never wait in a loop.
  A written rule was still broken under load: where the project can, a hook enforces it (a lock taken atomically
  before each connector call, with an expiry). Release it on **every** outcome — success, failure and a permission
  denial: the after-call event fires on success only, and a failed call held the lock until it expired.
- Taking a field off a screen does not stop the API writing it, on a locked field and on a plain one alike; and a
  field's global context cannot be narrowed to some issue types. Guard such a field with the review script, not with
  the screen alone.
- `timetracking` is not accepted at creation: set it right after with `editJiraIssue`. The same for sub-tasks.
- A transition to a done status does not accept `resolution` (400 `TRANSITION_FAILED`): transition first, then
  `editJiraIssue` with the resolution.
- Editing a worklog moves the remaining estimate: on a closed ticket, write `remainingEstimate: "0m"` again after.
- A goal links to a ticket through `addConnectionsToGoals` with the goal's **ARI** (from `getGoal`). With the goal's
  key it answers `[]`, no error, and links nothing.
- In JQL `0m` is not EMPTY, and there are no sub-queries (`parent in (labels = x)` fails): list the keys.
- The story point field id differs on every site: take it from the playbook, which took it from the board.
- **A report that shows nothing is a defect, not an absence of data.** After changing estimates, sprints or the board,
  open the reports and look at them: an empty burnup ("no estimated issues") means the board reads another field.
- A sprint's commitment is the points its tickets had when it started: points written after the start show as scope
  added, and a closed sprint's history cannot be rewritten.
- Automation on a free site has a monthly execution cap: prefer explicit calls to automation rules.
- A very long description can fail in one call: if it does, rewrite it more compactly, without dropping content.

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
