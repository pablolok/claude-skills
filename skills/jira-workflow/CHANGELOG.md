# Changelog

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

