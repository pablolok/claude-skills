# Estimates — the board's point field, Epics and calibration in full

Group 6 of the skill states the rules; this is each with the procedure and the measurements behind it.

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
