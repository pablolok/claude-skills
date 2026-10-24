# The total review — the checks in full

After a heavy day of work and before every release, these checks must return **zero rows**, except tickets the user
opened by hand. The points field, labels and sprints are the parameters the project's playbook declares.

- `issuetype != Epic AND labels is EMPTY`, and tickets without one of the two role labels;
- the manual label without an assignee, or the agent's label with one;
- a plan's ticket outside its sprint (`sprint is EMPTY`);
- a description without acceptance criteria, a "what to do" section or reproduction steps;
- `fixVersion in releasedVersions() AND statusCategory != Done`;
- `statusCategory = Done AND fixVersion is EMPTY`;
- `statusCategory = Done AND resolution is EMPTY`;
- at least one unreleased version (`getJiraProjectVersions`, status unreleased): none means the last release did not
  open the next one, and the next ticket that closes has no version to take;
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
