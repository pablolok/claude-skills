# Changelog

## [1.1.5] - 2026-10-19
- A user's sub-task the conversation completes is closed in that step's round


## [1.1.4] - 2026-10-19
- The real hours at close are the worklogs summed from the tracker, never a recalled total


## [1.1.3] - 2026-10-18
- editJiraIssue fields all inside fields; transitionJiraIssue takes transitionId


## [1.1.2] - 2026-10-18
- A transition rejects fields that are not on its screen: fixVersions goes in with an edit before it, the resolution after.


## [1.1.1] - 2026-10-16
- Only an agent that has the connector makes the calls: check a worker's tools before delegating a tracker step


## [1.1.0] - 2026-10-16
- The core keeps the twelve rule groups; the estimates procedure, the total review's checks and the connector's pitfalls move to references/. New rule: a write answers with the whole ticket, so use executeRead/executeWrite with responseFields or a compact view, and never read back a ticket just written. A closed parent or piece of work runs the skill-retrospective skill.


## [1.0.9] - 2026-10-14
- A compact read can omit fixVersions and timetracking: read them with the full view


## [1.0.8] - 2026-10-13
- A sub-task type's display name may not match in JQL: filter with issuetype in subTaskIssueTypes()


## [1.0.7] - 2026-10-13
- A failed verification becomes a Bug that blocks it; the verification stays open, no fixVersion, repeated after the fix's release


## [1.0.6] - 2026-10-13
- The connector-call lock is released on every outcome (success, failure, permission denial): the after-call event fires on success only, and a failed call held the lock until it expired

## [1.0.5] - 2026-10-13
- A worklog's finish is the clock read when logging, never a guessed end; what a query cannot check (every report against the sum of its tickets, parents against their sub-tasks, Epics) runs from a script the project keeps; a hook can enforce one connector call at a time; a field off a screen is still writable through the API

## [1.0.4] - 2026-10-13
- An Epic has no points in the board's field and never goes into a sprint — the board counts it as one more ticket, so its points added to its children's (a burndown at 68 instead of 18.5, a version report at 352 instead of 198); the total review checks both

## [1.0.3] - 2026-10-13
- The old point field is taken off the project's screens, not cleared — check that nothing reads it first; a locked field stays writable through the API off every screen, so the agent never sends it again

## [1.0.2] - 2026-10-13
- Points go in the field the board measures — read it with getJiraBoardConfig, move the points there once and write only that field (a company-managed board binds its Story points method to a plain number field, never to the locked estimate); check it in the total review; an empty report is a defect; a sprint's commitment is the points at its start


## [1.0.1] - 2026-10-13
- An estimate must match the real hours — estimate from closed tickets of the same kind, never with a size table calibrated on another kind of work; a gap of more than twice at close is a defect explained in a comment


## [1.0.0] - 2026-10-13
- First published version — Jira as the first tool, status moved when the fact happens, points and hours on every ticket, continuous worklogs, Blocks links in the right direction, the total review and the connector's pitfalls; project values declared by the project's playbook

