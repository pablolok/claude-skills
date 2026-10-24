# The Atlassian connector — its pitfalls

Group 10 of the skill states the rules for every call; these are the behaviours of the connector and of Jira that
have each cost a wrong result once. Read them before an operation you have not run this session.

- Taking a field off a screen does not stop the API writing it, on a locked field and on a plain one alike; and a
  field's global context cannot be narrowed to some issue types. Guard such a field with the review script, not with
  the screen alone.
- `timetracking` is not accepted at creation: set it right after with `editJiraIssue`. The same for sub-tasks.
- A transition accepts only the fields on its own screen: `resolution` to a done status and `fixVersions` are
  rejected (400, "not on the appropriate screen"). Set `fixVersions` with `editJiraIssue` before the transition, the
  resolution right after it.
- Through `executeWrite`, `editJiraIssue` takes every field (`timetracking`, `labels`, custom fields, the
  description) inside `inputs.fields`; one left beside `fields` is rejected as invalid input. `transitionJiraIssue`
  takes `transitionId` directly in `inputs`, not a `transition` object.
- Releasing, updating or creating a version (`manageJiraProjectVersion`) is classed destructive: it runs only through
  `executeDestructive`; `executeWrite` refuses it (403) and changes nothing.
- A write through the execute tools whose `responseFields` names a path the answer does not have returns `{}`, with no
  error, and the write happened (a comment added with `responseFields: ["id"]`). Never repeat it, or a comment lands
  twice. The first time, read back the one field that proves it (`fields.comment.total`) and write in the playbook
  that this operation answers `{}`; from then on, no read-back.
- Editing a worklog moves the remaining estimate: on a closed ticket, write `remainingEstimate: "0m"` again after.
- A goal links to a ticket through `addConnectionsToGoals` with the goal's **ARI** (from `getGoal`). With the goal's
  key it answers `[]`, no error, and links nothing.
- In JQL `0m` is not EMPTY, and there are no sub-queries (`parent in (labels = x)` fails): list the keys.
- A sub-task type's display name may not match in JQL (a localized name returned no rows while the type existed): filter
  with `issuetype in subTaskIssueTypes()`.
- The story point field id differs on every site: take it from the playbook, which took it from the board.
- A compact read (the default view, and a JQL search even when `fields` names them) can leave out `fixVersions` and
  `timetracking` without saying so: read them with the full view and `responseFields`, and never conclude from a
  compact read that a field is empty.
- **A report that shows nothing is a defect, not an absence of data.** After changing estimates, sprints or the board,
  open the reports and look at them: an empty burnup ("no estimated issues") means the board reads another field.
- A sprint's commitment is the points its tickets had when it started: points written after the start show as scope
  added, and a closed sprint's history cannot be rewritten.
- Automation on a free site has a monthly execution cap: prefer explicit calls to automation rules.
- A very long description can fail in one call: if it does, rewrite it more compactly, without dropping content.
